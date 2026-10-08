import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { root, testDir, previewDir } from './test-catalog.js';

const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm' };

// Shared by Astro development and the isolated preview renderer.
export function testFiles({ liveReload = false } = {}) {
  return async (req, res, next) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/test' || pathname === '/test/') return next();
      let file;
      if (pathname === '/p5.book.js') file = resolve(root, 'p5.book.js');
      else {
        const candidates = pathname.startsWith('/test/previews/')
          ? [[previewDir, pathname.slice('/test/previews/'.length)]]
          : pathname.startsWith('/test/')
          ? [[testDir, pathname.slice(6)]]
          : [[resolve(root, 'public'), pathname.slice(1)]];
        for (const [base, relative] of candidates) {
          const candidate = resolve(base, relative);
          if (!candidate.startsWith(base + sep)) continue;
          const info = await stat(candidate).catch(() => null);
          if (!info) continue;
          if (info.isDirectory()) {
            if (!pathname.endsWith('/')) {
              res.writeHead(302, { Location: url.pathname + '/' + url.search }); res.end(); return;
            }
            file = resolve(candidate, 'index.html');
          } else file = candidate;
          break;
        }
      }
      if (!file) return next();
      let content = await readFile(file);
      if (liveReload && extname(file) === '.html') {
        content = content.toString().replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
      }
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(content);
    } catch (error) {
      if (error.code === 'ENOENT') return next();
      next(error);
    }
  };
}
