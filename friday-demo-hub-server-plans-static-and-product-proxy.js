// Friday Demo Hub — single entry point for all demo products
// Routes:
//   /product/:name/*  → reverse-proxy to product's local port (strip prefix)
//   /*                → serve plans/ as static (Demo Gallery)
//
// Add new products to PRODUCT_PORTS below — no other changes needed.

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

const PORT = 9030;

// Registry: product slug → local port
const PRODUCT_PORTS = {
  'domain-reputation': 9041,
  'email-auth-checker': 9042,
  'ssl-health-dashboard': 9043,
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
    };
    const cmd = cmdMap[port] || 'dev:hub';
    return c.text(`Product server ":${port}" unreachable — chạy "pnpm ${cmd}" để start product server`, 502);
  }
});

// Redirect /product/:name (no trailing slash) to canonical URL
app.get('/product/:name', (c) =>
  c.redirect(`/product/${c.req.param('name')}/`, 301)
);

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
