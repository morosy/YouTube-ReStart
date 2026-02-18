# YouTube-ReStarter

YouTube の動画を **必ず 0:00 から再生**するための Chrome 拡張機能です．  
YouTube の SPA（Single Page Application）構造に対応し，動画遷移時に自動で再生位置をリセットします．  

---

## バージョンについて

| 区分 | バージョン |
|------|------------|
| Chrome Web Store 公開版 | v1.0.0 |
| 開発バージョン | v1.4.5 |

本リポジトリでは開発履歴を保持するため内部バージョンを継続していますが，  
Chrome Web Store 初回公開版を **v1.0.0** としてリリースしています．  

---

## 主な機能

### 基本機能
- YouTube の動画を **常に 0:00 から再生**
- SPA 遷移対応（関連動画クリック，戻る／進む）
- ON / OFF 切替
- OFF → ON 操作時の誤動作防止

---

### 再生時間の復元（v1.3.5 以降）
- 0:00 にリセットする直前の再生時間を記憶
- ポップアップの「再生時間を復元」ボタンで復元
- 説明文に復元予定時刻を動的表示
- 有効化 OFF の場合は復元 UI 非表示

---

### ポップアップ通知

- 表示 ON / OFF
- 表示位置（左上，中央，右上）
- 大きさ（0.5x – 2.0x）
- 表示時間（1～10秒）
- 背景色／文字色カスタマイズ
- アニメーション ON / OFF
- アニメーション速度（100ms – 1000ms）
- プレビュー機能

---

### アイコン動的切替（v1.4.0 以降）

- ON 状態：`icon_on*.png`
- OFF 状態：`icon_off*.png`
- Service Worker による即時反映
- バッジ表示（ON / OFF）

---

### 設定画面

タブ構成：

- 基本設定
- ポップアップ設定
- 拡張設定

共通フッター：
- 設定を保存（Ctrl / ⌘ + S 対応）
- 設定を初期化

---

### 拡張設定

- カスタムCSS適用
- 設定を書き出し（ytr.json）
- 設定を読み込み（JSONインポート）

---

## 対応ページ

- `https://www.youtube.com/watch?v=[ID]`

※ 現在は `/watch` ページのみ対象です．  
（Shorts や埋め込み動画は未対応）

---

## 技術仕様

- Chrome Extensions Manifest V3
- Service Worker（background）
- Content Script 制御
- History API（pushState／replaceState）
- yt-navigate-finish イベント対応
- MutationObserver 監視
- chrome.storage.local による設定保存
- chrome.action.setIcon による動的アイコン変更

---

## ディレクトリ構成

```
YouTube-ReStart/
├── manifest.json
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── styles/
│       └── toast.css
└── assets/
    └── icon/
        ├── icon_on16.png
        ├── icon_on48.png
        ├── icon_on128.png
        ├── icon_off16.png
        ├── icon_off48.png
        ├── icon_off128.png
        └── setting.png
```

---

## 注意事項

- 拡張機能更新後は YouTube タブをリロードすると安定します．
- YouTube 側の仕様変更により動作しなくなる可能性があります．

---

## 開発履歴

<details>
<summary>開発履歴</summary>

- v1.0.0 初期実装
- v1.1.0 トースト通知追加
- v1.2.x ON / OFF 制御改善
- v1.3.x 設定画面追加・復元機能追加
- v1.4.0 動的アイコン切替機能追加
- v1.4.5 タブUI化・設定入出力機能追加

</details>

---

## プライバシー

本拡張機能は：

- 個人情報を収集しません
- 外部サーバーへ通信しません
- 設定はローカルにのみ保存されます

---

## ライセンス

MIT License

---

## 作者

Shunsuke MOROZUMI
