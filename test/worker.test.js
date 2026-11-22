// Unit tests for the Hello World Worker. They call the default export's
// fetch() handler directly, so no Wrangler or network access is needed.
// Run with: npm test   (requires Node.js 18+ for node:test and global Request)

import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const BASE = "https://example.test";

async function call(path, { method = "GET", headers = {} } = {}) {
  const request = new Request(BASE + path, { method, headers });
  return worker.fetch(request, {}, {});
}

async function pageLang(path, headers) {
  const res = await call(path, { headers });
  const html = await res.text();
  return { res, html, lang: html.match(/<html lang="([^"]+)"/)[1] };
}

// ---- Greetings -------------------------------------------------------------

test("?lang=en renders the English greeting", async () => {
  const { res, html, lang } = await pageLang("/?lang=en");
  assert.equal(res.status, 200);
  assert.equal(lang, "en");
  assert.match(html, /<h1>Hello, World!<\/h1>/);
  assert.match(html, /<title>Hello World<\/title>/);
});

test("?lang=ja renders the Japanese greeting", async () => {
  const { res, html, lang } = await pageLang("/?lang=ja");
  assert.equal(res.status, 200);
  assert.equal(lang, "ja");
  assert.match(html, /<h1>こんにちは、世界！<\/h1>/);
  assert.match(html, /<title>こんにちは世界<\/title>/);
  assert.equal(res.headers.get("Content-Language"), "ja");
});

test("?lang=zh renders the Chinese greeting", async () => {
  const { res, html, lang } = await pageLang("/?lang=zh");
  assert.equal(res.status, 200);
  assert.equal(lang, "zh");
  assert.match(html, /<h1>你好，世界！<\/h1>/);
  assert.match(html, /<title>你好，世界<\/title>/);
  assert.equal(res.headers.get("Content-Language"), "zh");
});

test("response is HTML with UTF-8 charset and Vary/Cache headers", async () => {
  const res = await call("/?lang=ja");
  assert.equal(res.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("Vary"), "Accept-Language");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=300");
});

// ---- Query parameter selection and fallback --------------------------------

test("?lang overrides Accept-Language", async () => {
  const { lang } = await pageLang("/?lang=zh", { "Accept-Language": "en-US" });
  assert.equal(lang, "zh");
});

test("unknown ?lang falls back to Accept-Language", async () => {
  const { lang } = await pageLang("/?lang=fr", { "Accept-Language": "ja" });
  assert.equal(lang, "ja");
});

test("unknown ?lang with no Accept-Language falls back to English", async () => {
  const { lang } = await pageLang("/?lang=fr");
  assert.equal(lang, "en");
});

test("prototype property names are not treated as languages", async () => {
  for (const bad of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    const { res, lang } = await pageLang(`/?lang=${bad}`);
    assert.equal(res.status, 200);
    assert.equal(lang, "en", `?lang=${bad} should fall back to en`);
  }
});

test("empty ?lang falls back to default", async () => {
  const { lang } = await pageLang("/?lang=");
  assert.equal(lang, "en");
});

test("language links are present for all three languages", async () => {
  const { html } = await pageLang("/?lang=en");
  assert.match(html, /href="\/\?lang=en"/);
  assert.match(html, /href="\/\?lang=ja"/);
  assert.match(html, /href="\/\?lang=zh"/);
  assert.match(html, /<a href="\/\?lang=en" hreflang="en" aria-current="true">/);
});

test("aria-current moves to the selected non-English language link", async () => {
  const { html } = await pageLang("/?lang=zh");
  assert.match(html, /<a href="\/\?lang=zh" hreflang="zh" aria-current="true">/);
  assert.doesNotMatch(html, /<a href="\/\?lang=en" hreflang="en" aria-current/);
  assert.doesNotMatch(html, /<a href="\/\?lang=ja" hreflang="ja" aria-current/);
});

// ---- Accept-Language negotiation -------------------------------------------

test("Accept-Language selects a supported language", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "ja" })).lang, "ja");
  assert.equal((await pageLang("/", { "Accept-Language": "zh-CN" })).lang, "zh");
  assert.equal((await pageLang("/", { "Accept-Language": "en-US" })).lang, "en");
});

test("primary subtag matching handles regional and script variants", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "ja-JP" })).lang, "ja");
  assert.equal((await pageLang("/", { "Accept-Language": "zh-Hant-TW" })).lang, "zh");
  assert.equal((await pageLang("/", { "Accept-Language": "EN-gb" })).lang, "en");
});

test("higher q wins regardless of header order", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "ja;q=0.2,en;q=0.9" });
  assert.equal(lang, "en");
});

test("equal q keeps header order", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "zh,ja" })).lang, "zh");
  assert.equal((await pageLang("/", { "Accept-Language": "ja;q=0.5,zh;q=0.5" })).lang, "ja");
});

test("q=0 is rejected", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "ja;q=0, en;q=0.1" });
  assert.equal(lang, "en");
});

test("all q=0 falls back to English", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "ja;q=0, zh;q=0.0" });
  assert.equal(lang, "en");
});

test("q=0 with a supported language still falls back to English, not that language", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "zh;q=0" });
  assert.equal(lang, "en");
});

test("malformed q is ignored and the entry is skipped", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "ja;q=abc, zh;q=0.5" });
  assert.equal(lang, "zh");
  const { lang: lang2 } = await pageLang("/", { "Accept-Language": "ja;q=2" });
  assert.equal(lang2, "en");
});

test("wildcard maps to English default", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "*" })).lang, "en");
});

test("wildcard does not re-admit an explicitly excluded language (regression)", async () => {
  // en is excluded with q=0, so * must not select English. ja is listed at 0.5,
  // so * cannot select it either; zh is the only unlisted supported language.
  const { lang } = await pageLang("/", { "Accept-Language": "en;q=0, *;q=0.9, ja;q=0.5" });
  assert.equal(lang, "zh");
});

test("wildcard picks the first unlisted supported language when English is excluded", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "en;q=0, *" })).lang, "ja");
});

test("wildcard honors primary-subtag exclusion (en-GB;q=0 excludes en)", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "en-GB;q=0, *;q=0.5" })).lang, "ja");
});

test("wildcard with q=0 selects nothing and falls back to English", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "*;q=0" })).lang, "en");
});

test("wildcard ranked below a listed supported language does not override it", async () => {
  assert.equal((await pageLang("/", { "Accept-Language": "*;q=0.2, zh;q=0.5" })).lang, "zh");
});

test("wildcard still picks an unlisted language above a lower-ranked listed one", async () => {
  // en is listed at 0.3, so * (0.9) selects the next unlisted language, ja.
  assert.equal((await pageLang("/", { "Accept-Language": "en;q=0.3, *;q=0.9" })).lang, "ja");
});

test("no supported language acceptable falls back to English (all listed, all excluded)", async () => {
  const { lang } = await pageLang("/", {
    "Accept-Language": "en;q=0, ja;q=0, zh;q=0, *;q=0.9",
  });
  assert.equal(lang, "en");
});

test("unsupported languages fall back to English", async () => {
  const { lang } = await pageLang("/", { "Accept-Language": "fr-FR, de;q=0.8" });
  assert.equal(lang, "en");
});

test("no Accept-Language header falls back to English", async () => {
  const { lang } = await pageLang("/");
  assert.equal(lang, "en");
});

test("substring-only matches are not treated as the language", async () => {
  // "japanese" is not a valid tag; primary subtag must match exactly.
  const { lang } = await pageLang("/", { "Accept-Language": "japanese" });
  assert.equal(lang, "en");
});

// ---- Routes ----------------------------------------------------------------

test("GET / returns 200 HTML", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<h1>Hello, World!<\/h1>/);
});

test("GET /health returns 200 ok", async () => {
  const res = await call("/health");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.equal(await res.text(), "ok");
});

test("unknown path returns 404", async () => {
  const res = await call("/nope");
  assert.equal(res.status, 404);
  assert.equal(await res.text(), "Not Found");
});

test("unknown path with trailing segments returns 404", async () => {
  const res = await call("/health/extra");
  assert.equal(res.status, 404);
});

test("POST returns 405 with Allow header", async () => {
  const res = await call("/", { method: "POST" });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET, HEAD");
  assert.equal(await res.text(), "Method Not Allowed");
});

test("other write methods return 405", async () => {
  for (const method of ["PUT", "DELETE", "PATCH", "OPTIONS"]) {
    const res = await call("/health", { method });
    assert.equal(res.status, 405, method);
  }
});

// ---- HEAD responses --------------------------------------------------------

test("HEAD / returns 200 with headers and no body", async () => {
  const res = await call("/", { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("Content-Language"), "en");
  assert.equal(await res.text(), "");
});

test("HEAD /health returns 200 with no body", async () => {
  const res = await call("/health", { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.equal(res.body, null);
  assert.equal(await res.text(), "");
});

test("HEAD on unknown path returns 404 with no body", async () => {
  const res = await call("/missing", { method: "HEAD" });
  assert.equal(res.status, 404);
  assert.equal(res.body, null);
});

test("HEAD / honors Accept-Language negotiation", async () => {
  const res = await call("/", {
    method: "HEAD",
    headers: { "Accept-Language": "ja;q=0.2,zh;q=0.9" },
  });
  assert.equal(res.headers.get("Content-Language"), "zh");
  assert.equal(res.body, null);
});
