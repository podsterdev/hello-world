# hello-world

A Hello World web app deployable to Cloudflare Workers. It supports English, Japanese, Chinese, Vietnamese, and Khmer.

## Languages

- `/?lang=en` — English: "Hello, World!"
- `/?lang=ja` — 日本語: "こんにちは、世界！"
- `/?lang=zh` — 中文: "你好，世界！"
- `/?lang=vi` — Tiếng Việt: "Xin chào, thế giới!"
- `/?lang=km` — ភាសាខ្មែរ: "សួស្តី ពិភពលោក!" (proposed copy, pending review by Patrick)

The language picker on the page links to these URLs. An explicit `lang` parameter always wins over the browser's `Accept-Language` header, so `/?lang=vi` renders Vietnamese even for a browser that prefers Japanese, and `/?lang=km` renders Khmer the same way. Responses for every language set `<html lang>` and the `Content-Language` header to the chosen code.

If no valid `lang` parameter is given, the language is chosen from the `Accept-Language` header. Header entries are ranked by their `q` weight (highest first, ties in header order), `q=0` entries are never chosen, and only the primary subtag is matched (`ja-JP` → Japanese, `zh-Hant` → Chinese, `vi-VN` → Vietnamese, `km-KH` → Khmer). For example, `ja;q=0.2, vi;q=0.9` returns Vietnamese.

### Choosing Khmer

- Link or type `/?lang=km` to force Khmer for a page, whatever the browser prefers.
- Or set the browser language to Khmer (`km` or `km-KH`) and visit `/` with no `lang` parameter.
- Khmer is also picked from a weighted header such as `km;q=0.9, en;q=0.5`. Exclude it with `km;q=0`.

Wildcard (`*`) matches only languages the header does not list at all, with English preferred, then Japanese, Chinese, Vietnamese, and Khmer. A language listed with `q=0` is excluded from the wildcard too, so `en;q=0, *;q=0.9, ja;q=0.5` returns Chinese. `*;q=0` selects nothing.

Fallback: if no supported language is acceptable (the header is missing, lists only unsupported languages, excludes every supported language, or the wildcard has no unlisted language left), the response is English.

Other routes: `/health` returns `ok`; any other path returns 404; methods other than GET and HEAD return 405. HEAD responses carry the same headers as GET but no body.

## Development

The project is ES modules (`"type": "module"` in `package.json`), so it loads without relying on Node's module auto-detection.

Development requires Node.js 22.12.0 or later (declared in `engines`, and the minimum for the pinned Wrangler 4.166.0). Verified with `wrangler dev` on Node.js 22.23.5.

The unit tests have a lower minimum: they run on Node.js 18 (verified on 18.20.8 with `node --test`), but Wrangler itself does not.

```sh
npm install
npm run dev     # wrangler dev, local at http://localhost:8787 (Node.js 22.12.0+)
npm test        # unit tests (Node.js 18+)
```

## Deploy to Cloudflare

```sh
npx wrangler login
npm run deploy
```
