// Friday Demo Hub — single entry point for all demo products
// Routes:
//   /product/:name/*  → reverse-proxy to product's local port (strip prefix)
//   /*                → serve plans/ as static (Demo Gallery)
//
// Add new products to PRODUCT_PORTS below — no other changes needed.

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile } from 'node:fs/promises';

const PORT = 9030;

// Registry: product slug → local port
const PRODUCT_PORTS = {
  'domain-reputation': 9041,
  'email-auth-checker': 9042,
  'ssl-health-dashboard': 9043,
  'ip-reputation': 9044,
};

const app = new Hono();

// Reverse-proxy /product/:name/* → strip prefix → forward to product server
app.all('/product/:name/*', async (c) => {
  const name = c.req.param('name');
  const port = PRODUCT_PORTS[name];
  if (!port) return c.text(`Product "${name}" not registered`, 404);

  const original = new URL(c.req.url);
  const strippedPath = original.pathname.slice(`/product/${name}`.length) || '/';
  const targetUrl = `http://localhost:${port}${strippedPath}${original.search}`;

  const proxiedReq = new Request(targetUrl, {
    method:  c.req.method,
    headers: c.req.raw.headers,
    body:    ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
    // Required for Node 18+ fetch with streaming body
    duplex: 'half',
  });

  try {
    return await fetch(proxiedReq);
  } catch {
    const cmdMap = {
      9041: 'dev:domain-rep',
      9042: 'dev:email-auth',
      9043: 'dev:ssl-health',
      9044: 'dev:ip-rep',
    };
    const cmd = cmdMap[port] || 'dev:hub';
    return c.text(`Product server ":${port}" unreachable — chạy "pnpm ${cmd}" để start product server`, 502);
  }
});

// Redirect /product/:name (no trailing slash) to canonical URL
app.get('/product/:name', (c) =>
  c.redirect(`/product/${c.req.param('name')}/`, 301)
);

// Render .md files as HTML (with CDN marked.js) instead of triggering download
app.use('/*', async (c, next) => {
  if (!c.req.path.endsWith('.md')) return next();
  const filePath = `./plans${c.req.path}`;
  try {
    const raw = await readFile(filePath, 'utf-8');
    const title = c.req.path.split('/').pop();
    return c.html(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;line-height:1.6}
    .topbar{display:flex;align-items:center;gap:12px;padding:12px 24px;background:#161b22;border-bottom:1px solid #30363d;position:sticky;top:0;z-index:10}
    .topbar a{color:#58a6ff;text-decoration:none;font-size:13px;opacity:.8}
    .topbar a:hover{opacity:1}
    .topbar .filename{font-size:13px;color:#8b949e;font-family:monospace}
    .content{max-width:900px;margin:0 auto;padding:32px 24px}
    #md h1,#md h2,#md h3,#md h4{color:#e6edf3;margin:24px 0 12px;padding-bottom:6px}
    #md h1,#md h2{border-bottom:1px solid #30363d}
    #md p{margin:10px 0;color:#c9d1d9}
    #md a{color:#58a6ff}
    #md code{background:#161b22;border:1px solid #30363d;border-radius:4px;padding:2px 6px;font-size:13px;font-family:monospace;color:#ff7b72}
    #md pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0}
    #md pre code{background:none;border:none;padding:0;color:#e6edf3}
    #md table{border-collapse:collapse;width:100%;margin:16px 0}
    #md th,#md td{border:1px solid #30363d;padding:8px 12px;text-align:left}
    #md th{background:#161b22;color:#e6edf3}
    #md tr:nth-child(even) td{background:#0d1117}
    #md blockquote{border-left:3px solid #388bfd;background:#161b22;padding:10px 16px;margin:16px 0;border-radius:0 6px 6px 0;color:#8b949e}
    #md ul,#md ol{padding-left:24px;margin:10px 0}
    #md li{margin:4px 0;color:#c9d1d9}
    #md hr{border:none;border-top:1px solid #30363d;margin:24px 0}
    #md strong{color:#e6edf3}
  </style>
</head>
<body>
  <div class="topbar">
    <a href="javascript:history.back()">← Quay lại</a>
    <span class="filename">${c.req.path}</span>
  </div>
  <div class="content">
    <div id="md"></div>
  </div>
  <script>
    document.getElementById('md').innerHTML = marked.parse(${JSON.stringify(raw)});
  </script>
</body>
</html>`);
  } catch {
    return c.notFound();
  }
});

// Serve plans/ directory as the Demo Gallery root
app.use('/*', serveStatic({ root: './plans' }));

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\niNET Friday Demo Hub  →  http://localhost:${PORT}`);
  console.log(`  Demo Gallery : http://localhost:${PORT}/`);
  for (const [name, port] of Object.entries(PRODUCT_PORTS)) {
    console.log(`  ${name.padEnd(24)}: http://localhost:${PORT}/product/${name}/ → :${port}`);
  }
  console.log('');
});
