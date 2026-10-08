import { copyFileSync, cpSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';
import { config } from './build-lib.js';
import { root, testDir, previewDir } from './test-catalog.js';
import { testFiles } from './test-files.js';
import { generateTestPreviews } from './test-previews.js';


export default function localExamples() {
  return {
    name: 'local-examples',
    hooks: {
      'astro:build:setup': async () => {
        await build(config);
        // Hosted builds (e.g. Vercel) have no Chromium; the gallery just goes without cover images.
        await generateTestPreviews().catch(error => {
          console.warn(`[test previews] Skipped: ${error.message.split('\n')[0]}`);
        });
      },
      'astro:server:setup': async ({ server, logger }) => {
        let ready = false;
        let closed = false;
        let timer;
        let running = Promise.resolve();
        // Serialize renders so saving again during a capture cannot race its output.
        const schedulePreviews = () => {
          if (!ready || closed) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            running = running.then(async () => {
              if (closed) return;
              try {
                await generateTestPreviews();
                server.ws.send({ type: 'full-reload', path: '/test/' });
              } catch (error) {
                logger.error(`${error.message}\nFix the sketch and save again. For a missing browser, run npm run previews:setup.`);
              }
            });
          }, 400);
        };
        const ctx = await context({ ...config, plugins: [{
          name: 'refresh-local-book',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length) return;
              server.ws.send({ type: 'full-reload', path: '*' });
              schedulePreviews();
            });
          },
        }] });
        try {
          await ctx.rebuild();
          await generateTestPreviews();
          ready = true;
          await ctx.watch();
        } catch (error) {
          await ctx.dispose();
          throw new Error(`${error.message}\nIf Chromium is missing, run npm run previews:setup.`, { cause: error });
        }
        server.httpServer?.once('close', () => {
          closed = true;
          clearTimeout(timer);
          void ctx.dispose();
        });
        server.watcher.add([testDir, resolve(root, 'public/fonts')]);
        const reload = file => {
          // Generated output must never trigger another render.
          if (file.startsWith(previewDir + sep)) return;
          if (file.startsWith(testDir + sep) || file.startsWith(resolve(root, 'public/fonts') + sep)) {
            server.ws.send({ type: 'full-reload', path: '*' });
            schedulePreviews();
          }
        };
        server.watcher.on('add', reload).on('change', reload).on('unlink', reload);
        server.middlewares.use(testFiles({ liveReload: true }));
      },
      'astro:build:done': ({ dir }) => {
        const out = fileURLToPath(dir);
        copyFileSync(resolve(root, 'p5.book.js'), resolve(out, 'p5.book.js'));
        cpSync(testDir, resolve(out, 'test'), { recursive: true });
        cpSync(previewDir, resolve(out, 'test/previews'), { recursive: true });
      },
    },
  };
}
