import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  server: { port: 9040 },
  output: 'static',
  site: 'https://lab.inet.vn',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  trailingSlash: 'always',
  integrations: [mdx()],
  vite: { ssr: { external: ['js-yaml'] } },
});
