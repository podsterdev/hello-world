# hello-world

A Hello World web app deployable to Cloudflare Workers. It supports English, Japanese, and Chinese.

## Languages

- `/?lang=en` — English: "Hello, World!"
- `/?lang=ja` — 日本語: "こんにちは、世界！"
- `/?lang=zh` — 中文: "你好，世界！"

If no `lang` parameter is given, the language is chosen from the `Accept-Language` header, falling back to English.

Other routes: `/health` returns `ok`; any other path returns 404.

## Development

```sh
npm install
npm run dev
```

## Deploy to Cloudflare

```sh
npx wrangler login
npm run deploy
```
