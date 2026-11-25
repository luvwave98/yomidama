# ヨミダマ

カードを伏せて同時にめくり、配球と狙い球を読み合う野球ゲームです。ブラウザで動き、ホーム画面に追加するとアプリとして遊べます（PWA）。

- 遊ぶ：https://luvwave98.github.io/yomidama/
- iPhone：Safariで開き、共有ボタンから「ホーム画面に追加」
- Android：Chromeで開き、「アプリをインストール」

## 構成

| 場所 | 中身 |
| --- | --- |
| `index.html` `manifest.webmanifest` `sw.js` `icons/` | 公開しているアプリ本体（組み立て済み） |
| `src/` | 組み立て前のソース（ルール `logic.js`、画面 `ui.js`、音 `sound.js`、見た目 `head.html`） |
| `src/assets/` | 絵（`*_a.webp`）とユニフォームの塗り分け情報（`mask_*.png`） |
| `src/tools/` | 素材の加工やバランス検証用のスクリプト |

## 組み立て方

```bash
cd src
python3 build.py       # src/index.html を作る（全部入りの1ファイル）
python3 build_pwa.py   # リポジトリ直下に公開用ファイル一式を書き出す
```

© 2026 Luv Cuero ／ あさみやソフト
