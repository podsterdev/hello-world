# hello-world

A Hello World web app deployable to Cloudflare Workers. It supports English, Japanese, and Chinese.

## Languages

- `/?lang=en` — English: "Hello, World!"
- `/?lang=ja` — 日本語: "こんにちは、世界！"
- `/?lang=zh` — 中文: "你好，世界！"

If no valid `lang` parameter is given, the language is chosen from the `Accept-Language` header, falling back to English. Header entries are ranked by their `q` weight (highest first, ties in header order), `q=0` entries are ignored, and only the primary subtag is matched (`ja-JP` → Japanese, `zh-Hant` → Chinese).

Other routes: `/health` returns `ok`; any other path returns 404; methods other than GET and HEAD return 405. HEAD responses carry the same headers as GET but no body.

## Development

```sh
npm install
npm run dev     # wrangler dev, local at http://localhost:8787
npm test        # unit tests (Node.js 18+)
```

## Deploy to Cloudflare

```sh
npx wrangler login
npm run deploy
```
