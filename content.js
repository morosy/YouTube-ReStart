(() => {
    'use strict';

    const DEBUG = false;

    const log = (...args) => {
        if (!DEBUG) {
            return;
        }
        // eslint-disable-next-line no-console
        console.log('[YouTube-Reset]', ...args);
    };

    const STORAGE_KEY = 'enabled';
    const TOAST_ID = 'ytr-toast';
    const TOAST_DURATION_MS = 2000;

    let lastHandledUrl = '';
    let pendingTimerId = null;

    // OFF/ON切替時に、過去のイベントハンドラが走っても無効化するための世代番号
    let generation = 0;

    const getEnabled = async () => {
        try {
            const result = await chrome.storage.sync.get([STORAGE_KEY]);
            const enabled = typeof result[STORAGE_KEY] === 'boolean' ? result[STORAGE_KEY] : true;
            return enabled;
        } catch (e) {
            // storageが読めない時は安全側でON扱い
            return true;
        }
    };

    const ensureToastElement = () => {
        let el = document.getElementById(TOAST_ID);
        if (el) {
            return el;
        }

        el = document.createElement('div');
        el.id = TOAST_ID;
        el.className = 'ytr-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.documentElement.appendChild(el);

        return el;
    };

    const showToast = (message) => {
        const el = ensureToastElement();
        el.textContent = message;

        el.classList.add('ytr-toast--show');

        if (el._ytrHideTimerId) {
            clearTimeout(el._ytrHideTimerId);
        }

        el._ytrHideTimerId = setTimeout(() => {
            el.classList.remove('ytr-toast--show');
            el._ytrHideTimerId = null;
        }, TOAST_DURATION_MS);
    };

    const isWatchUrl = (url) => {
        try {
            const u = new URL(url);
            return u.hostname === 'www.youtube.com' && u.pathname === '/watch' && u.searchParams.has('v');
        } catch (e) {
            return false;
        }
    };

    const waitForVideoElement = async (timeoutMs) => {
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            const video = document.querySelector('video');
            if (video) {
                return video;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return null;
    };

    const cancelPending = () => {
        if (pendingTimerId !== null) {
            clearTimeout(pendingTimerId);
            pendingTimerId = null;
        }
    };

    const startStorageListener = () => {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            // sync / local どちらでも動くようにする（環境差でsyncにならないケース対策）
            if (areaName !== 'sync' && areaName !== 'local') {
                return;
            }
            if (!changes[STORAGE_KEY]) {
                return;
            }

            const oldValue = changes[STORAGE_KEY].oldValue;
            const newValue = changes[STORAGE_KEY].newValue;

            // 切替が入ったら世代を進めて、過去のイベントハンドラを無効化
            generation += 1;

            // OFFになったら、予約されている処理を即キャンセル（OFFでも実行される対策）
            if (newValue === false) {
                cancelPending();
                log('disabled: cancel pending', { areaName });
                return;
            }

            // ver 1.2.1: 動画再生中に OFF -> ON したときには実行しない
            // ＝ONにした瞬間の現在URLを「処理済み」にして、今の動画には掛けない
            if (oldValue === false && newValue === true) {
                const currentUrl = location.href;
                if (isWatchUrl(currentUrl)) {
                    lastHandledUrl = currentUrl;
                    cancelPending();
                    log('OFF->ON: skip current watch', { currentUrl });
                }
            }
        });
    };

    const resetToZeroSafely = async (reason) => {
        const enabled = await getEnabled();
        if (!enabled) {
            log('disabled - skip', { reason, url: location.href });
            return;
        }

        const url = location.href;

        if (!isWatchUrl(url)) {
            log('skip (not watch url)', { url, reason });
            return;
        }

        if (url === lastHandledUrl) {
            log('skip (already handled)', { url, reason });
            return;
        }

        lastHandledUrl = url;
        log('handle', { url, reason });

        const currentGeneration = generation;

        const video = await waitForVideoElement(10000);
        if (!video) {
            log('video not found', { url, reason });
            return;
        }

        let toastShown = false;

        const tryReset = async (tag) => {
            // 途中でON/OFFが切り替わっていたら無効化
            if (currentGeneration !== generation) {
                log('generation changed - skip', { tag });
                return;
            }

            // 念のため、実行直前にも enabled を確認（OFFでも実行される対策の決定打）
            const stillEnabled = await getEnabled();
            if (!stillEnabled) {
                log('disabled before apply - skip', { tag });
                return;
            }

            try {
                video.currentTime = 0;
                log('reset currentTime=0', { tag });

                if (!toastShown) {
                    toastShown = true;
                    showToast('実行完了しました');
                }
            } catch (e) {
                log('reset failed', { tag, e });
            }
        };

        // immediate は async にしてもOK（順序は重要じゃない）
        tryReset('immediate');

        const onLoadedMetadata = () => {
            tryReset('loadedmetadata');
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);

        const onPlaying = () => {
            tryReset('playing');
            video.removeEventListener('playing', onPlaying);
        };
        video.addEventListener('playing', onPlaying);
    };

    const scheduleHandle = (reason) => {
        cancelPending();

        pendingTimerId = setTimeout(() => {
            pendingTimerId = null;
            resetToZeroSafely(reason);
        }, 50);
    };

    const hookHistoryApi = () => {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            scheduleHandle('history.pushState');
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            scheduleHandle('history.replaceState');
        };

        window.addEventListener('popstate', () => {
            scheduleHandle('popstate');
        });
    };

    const hookYouTubeNavigateEvent = () => {
        window.addEventListener('yt-navigate-finish', () => {
            scheduleHandle('yt-navigate-finish');
        });
    };

    const observeDomForVideoSwap = () => {
        const observer = new MutationObserver(() => {
            scheduleHandle('mutation');
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    };

    const init = async () => {
        startStorageListener();

        hookHistoryApi();
        hookYouTubeNavigateEvent();
        observeDomForVideoSwap();

        scheduleHandle('initial');
    };

    init();
})();