import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTestExamples, root, testDir, previewDir } from './test-catalog.js';
import { testFiles } from './test-files.js';

async function hashTree(hash, directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(entry.name);
    if (entry.isDirectory()) await hashTree(hash, resolve(directory, entry.name));
    else if (entry.isFile()) hash.update(await readFile(resolve(directory, entry.name)));
  }
}

export async function generateTestPreviews({ force = false } = {}) {
  await mkdir(previewDir, { recursive: true });
  const manifestPath = resolve(previewDir, 'manifest.json');
  const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
  const manifest = {};
  const shared = createHash('sha256');
  shared.update(await readFile(fileURLToPath(import.meta.url)));
  shared.update(await readFile(resolve(root, 'p5.book.js')));
  await hashTree(shared, resolve(testDir, 'lib'));
  await hashTree(shared, resolve(root, 'public/fonts'));
  const sharedHash = shared.digest('hex');
  const pending = [];
  for (const example of getTestExamples()) {
    const hash = createHash('sha256').update(sharedHash);
    await hashTree(hash, resolve(testDir, example.slug));
    const digest = hash.digest('hex');
    const image = resolve(previewDir, `${example.slug}.png`);
    const exists = await access(image).then(() => true, () => false);
    if (force || !exists || previous[example.slug] !== digest) pending.push({ ...example, image, digest });
    else manifest[example.slug] = digest;
  }
  let browser;
  let server;
  try {
    if (pending.length) {
      browser = await chromium.launch({ headless: true });
      const middleware = testFiles();
      server = createServer((req, res) => middleware(req, res, error => {
        res.statusCode = error ? 500 : 404; res.end(error?.message ?? 'Not found');
      }));
      await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
      const origin = `http://127.0.0.1:${server.address().port}`;
      for (const example of pending) {
        const page = await browser.newPage({ viewport: { width: 960, height: 800 }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          console.log(`[test previews] Rendering ${example.slug}…`);
          await page.goto(origin + example.href);
          // Wait for the real book, including asynchronous fonts and all pages.
          await page.locator('#p5book-mode-sel').waitFor({ state: 'visible', timeout: 120000 });
          await page.locator('#p5book-mode-sel').selectOption('flipbook');
          const cover = page.locator('#p5book-stage img').first();
          await cover.waitFor({ state: 'visible' });
          await cover.evaluate(image => image.decode());
          if (errors.length) throw new Error(errors.join('\n'));
          await cover.screenshot({ path: example.image, animations: 'disabled' });
          manifest[example.slug] = example.digest;
        } catch (error) {
          throw new Error(`Preview failed for test/${example.slug}: ${errors.join('; ') || error.message}`, { cause: error });
        } finally { await page.close(); }
      }
    }
    for (const slug of Object.keys(previous)) {
      if (!(slug in manifest)) await rm(resolve(previewDir, `${slug}.png`), { force: true });
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[test previews] ${pending.length} rendered, ${Object.keys(manifest).length - pending.length} cached.`);
  } finally {
    await browser?.close();
    if (server) await new Promise(done => server.close(done));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateTestPreviews({ force: process.argv.includes('--force') });
}
