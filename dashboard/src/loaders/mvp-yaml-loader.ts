// mvp-yaml-loader.ts — Custom Astro loader: reads products/*/mvp.yaml, validates via Zod safeParse
// On validation failure: emits InvalidManifest entry + logger.warn (does NOT fail build).
// On file-read / YAML-parse error: same — emit InvalidManifest + warn.

import type { Loader } from 'astro/loaders';
import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'js-yaml';
import { MvpManifestSchema } from '~/content/config';

/**
 * Custom loader that scans `baseDir` for subdirectories,
 * reads `mvp.yaml` in each, validates with Zod, and emits to store.
 *
 * @param baseDir - path relative to Astro project root (default: '../products')
 */
export function mvpYamlLoader(baseDir = '../products'): Loader {
  return {
    name: 'mvp-yaml-loader',
    load: async ({ store, logger, config }) => {
      // Resolve absolute path — config.root is a URL on Windows, use .pathname carefully
      const rootPath = config.root.pathname.replace(/^\/([A-Za-z]:)/, '$1');
      const productsDir = path.resolve(rootPath, baseDir);

      let entries: import('fs').Dirent[];
      try {
        entries = await fs.readdir(productsDir, { withFileTypes: true });
      } catch {
        // products/ directory doesn't exist yet — fine for empty build
        logger.warn(`mvp-yaml-loader: products dir not found at ${productsDir} — skipping`);
        return;
      }

      for (const dirent of entries.filter(d => d.isDirectory())) {
        const slug = dirent.name;
        const yamlPath = path.join(productsDir, slug, 'mvp.yaml');

        try {
          const raw = await fs.readFile(yamlPath, 'utf-8');
          const parsed = YAML.load(raw) as Record<string, unknown>;
          const result = MvpManifestSchema.safeParse({ ...parsed, slug });

          if (result.success) {
            store.set({ id: slug, data: result.data, filePath: yamlPath });
          } else {
            const errorMessages = result.error.issues.map(
              i => `${i.path.join('.') || 'root'}: ${i.message}`
            );
            logger.warn(
              `⚠ Invalid mvp.yaml [${slug}] at ${yamlPath}:\n  ${errorMessages.join('\n  ')}`
            );
            // Emit InvalidManifest entry so Phase 03 can render placeholder card with ⚠ badge
            store.set({
              id: slug,
              data: {
                __invalid: true as const,
                slug,
                filePath: yamlPath,
                errors: errorMessages,
              },
              filePath: yamlPath,
            });
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          logger.warn(`⚠ Cannot read/parse mvp.yaml [${slug}] at ${yamlPath}: ${message}`);
          store.set({
            id: slug,
            data: {
              __invalid: true as const,
              slug,
              filePath: yamlPath,
              errors: [message],
            },
            filePath: yamlPath,
          });
        }
      }
    },
  };
}
