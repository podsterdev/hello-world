// Hello World web app for Cloudflare Workers.
// Supports English, Japanese, and Chinese.
// Language selection: ?lang=en|ja|zh, else Accept-Language header, else English.

const GREETINGS = {
  en: { lang: "en", label: "English", title: "Hello World", message: "Hello, World!" },
  ja: { lang: "ja", label: "日本語", title: "こんにちは世界", message: "こんにちは、世界！" },
  zh: { lang: "zh", label: "中文", title: "你好，世界", message: "你好，世界！" },
};

const DEFAULT_LANG = "en";

function pickLanguage(request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("lang");
  if (requested && GREETINGS[requested]) {
    return requested;
  }

  const accept = request.headers.get("Accept-Language") || "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
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

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname !== "/") {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const lang = pickLanguage(request);
    return new Response(request.method === "HEAD" ? null : renderPage(lang), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Language": lang,
        Vary: "Accept-Language",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
