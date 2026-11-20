// Hello World web app for Cloudflare Workers.
// Supports English, Japanese, and Chinese.
// Language selection: ?lang=en|ja|zh, else Accept-Language header, else English.

const GREETINGS = {
  en: { lang: "en", label: "English", title: "Hello World", message: "Hello, World!" },
  ja: { lang: "ja", label: "日本語", title: "こんにちは世界", message: "こんにちは、世界！" },
  zh: { lang: "zh", label: "中文", title: "你好，世界", message: "你好，世界！" },
};

const DEFAULT_LANG = "en";

const isSupported = (code) => Object.prototype.hasOwnProperty.call(GREETINGS, code);

// RFC 7231 / 9110 qvalue: 0 to 1 with at most three decimals.
const QVALUE = /^(0(\.\d{0,3})?|1(\.0{0,3})?)$/;

// Parse an Accept-Language header into entries sorted by descending q.
// Entries with q=0 or a malformed q are dropped. Ties keep header order.
function parseAcceptLanguage(header) {
  const entries = [];
  for (const part of header.split(",")) {
    const [rawTag, ...params] = part.split(";");
    const tag = rawTag.trim().toLowerCase();
    if (!tag) continue;

    let q = 1;
    let valid = true;
    for (const param of params) {
      const eq = param.indexOf("=");
      if (eq === -1) continue;
      const name = param.slice(0, eq).trim().toLowerCase();
      const value = param.slice(eq + 1).trim();
      if (name === "q") {
        if (QVALUE.test(value)) {
          q = parseFloat(value);
        } else {
          valid = false;
        }
      }
    }
    if (!valid || q === 0) continue;
    entries.push({ tag, q, index: entries.length });
  }
  return entries
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);
}

function pickLanguage(request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("lang");
  if (requested && isSupported(requested)) {
    return requested;
  }

  const accept = request.headers.get("Accept-Language") || "";
  for (const tag of parseAcceptLanguage(accept)) {
    if (tag === "*") return DEFAULT_LANG;
    // Match on the primary subtag, so "ja-JP" -> ja and "zh-Hant" -> zh.
    const primary = tag.split("-")[0];
    if (isSupported(primary)) return primary;
  }
  return DEFAULT_LANG;
}

function renderPage(lang) {
  const t = GREETINGS[lang];
  const links = Object.keys(GREETINGS)
    .map((code) => {
      const g = GREETINGS[code];
      const current = code === lang ? ' aria-current="true"' : "";
      return `<a href="/?lang=${code}" hreflang="${code}"${current}>${g.label}</a>`;
    })
    .join(" | ");

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", "Noto Sans SC", sans-serif;
           margin: 0; min-height: 100vh; display: flex; flex-direction: column;
           align-items: center; justify-content: center; background: #f5f7fa; color: #1a1a1a; }
    h1 { font-size: 3rem; margin: 0 0 1rem; }
    nav a { margin: 0 0.5rem; color: #0b57d0; }
    nav a[aria-current="true"] { font-weight: bold; text-decoration: none; color: #1a1a1a; }
  </style>
</head>
<body>
  <main>
    <h1>${t.message}</h1>
    <nav>${links}</nav>
  </main>
</body>
</html>`;
}

// Build a response. For HEAD requests the headers are kept but the body is
// dropped, as HTTP requires.
function respond(request, body, init) {
  return new Response(request.method === "HEAD" ? null : body, init);
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return respond(request, "Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return respond(request, "ok", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (url.pathname !== "/") {
      return respond(request, "Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const lang = pickLanguage(request);
    return respond(request, renderPage(lang), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Language": lang,
        Vary: "Accept-Language",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
