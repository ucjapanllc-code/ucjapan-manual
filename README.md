# ucjapan-manual

UCJapan合同会社 宅建士向け実務マニュアル — GitHub Pages 公開用

**公開URL:** `https://ucjapanllc-code.github.io/ucjapan-manual/`

---

## 概要

宅建士業務（申込〜入居完了）の全工程を、Webブラウザで閲覧できる静的サイトとして構築したものです。

- 全文キーワード検索（Fuse.js）
- レスポンシブ対応（スマホ・タブレット・PC）
- ダークモード切り替え
- PWA対応（オフライン閲覧・ホーム画面追加）
- ビルドプロセス不要（ブラウザで直接開けます）

---

## ファイル構成

```
ucjapan-manual/
├── index.html              # メインページ
├── manifest.json           # PWA設定
├── service-worker.js       # オフライン対応
├── assets/
│   ├── style.css          # スタイル（レスポンシブ・ダークモード含む）
│   ├── script.js          # TOC生成・検索・スクロールスパイ
│   └── icons/             # PWAアイコン (192px / 512px)
├── content/
│   └── manual.md          # マニュアル本文（更新はここだけ）
└── README.md
```

---

## ローカルでの動作確認

`index.html` を直接ブラウザで開くと、`fetch()` がセキュリティ制限で失敗します。
**必ずローカルサーバー経由でアクセスしてください。**

### Python（推奨）

```bash
cd ucjapan-manual
python3 -m http.server 8080
# → http://localhost:8080 で確認
```

### Node.js (npx serve)

```bash
cd ucjapan-manual
npx serve .
```

---

## GitHub Pages へのデプロイ

### 初回設定

1. **GitHubにリポジトリを作成**
   - Organization: `ucjapanllc-code`
   - Repository name: `ucjapan-manual`
   - Visibility: **Public**

2. **ローカルリポジトリの初期化 & push**

```bash
cd ucjapan-manual
git init
git add .
git commit -m "Initial commit: 宅建士実務マニュアル MVP"
git branch -M main
git remote add origin https://github.com/ucjapanllc-code/ucjapan-manual.git
git push -u origin main
```

3. **GitHub Pages を有効化**
   - GitHubリポジトリ → Settings → Pages
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
   - Save

4. 数分後に `https://ucjapanllc-code.github.io/ucjapan-manual/` でアクセス可能になります。

### 以降の更新デプロイ

```bash
git add .
git commit -m "マニュアル更新: YYYY-MM-DD"
git push
```

`main` へのpushで自動デプロイされます（GitHub Actions不要）。

---

## マニュアルの更新方法

マニュアル本文の更新は `content/manual.md` だけ編集すれば反映されます。

1. `content/manual.md` を編集
2. ローカルサーバーで動作確認
3. `git add content/manual.md && git commit -m "マニュアル更新" && git push`

HTMLファイルの修正は不要です。

---

## 技術スタック

| ライブラリ | バージョン | 用途 |
|---|---|---|
| [marked.js](https://marked.js.org/) | 9.1.6 | MarkdownのHTMLレンダリング |
| [Fuse.js](https://www.fusejs.io/) | 7.0.0 | クライアントサイド全文検索 |
| [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) | — | フォント（Google Fonts） |

フレームワーク・ビルドプロセス不要。全てVanilla JS + CSS。

---

## 注意事項

- マニュアル内に管理会社名・実在する組織名が含まれています。公開リポジトリのURLを不必要に拡散しないよう運用上ご注意ください。
- PWAアイコン(`assets/icons/`)は必要に応じてブランドロゴ等に差し替えてください。
