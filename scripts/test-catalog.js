import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// npm commands run at the project root. import.meta.url points into dist after
// Astro bundles this module, so it cannot locate the editable source folders.
export const root = resolve(process.cwd());
export const testDir = resolve(root, 'test');
export const previewDir = resolve(root, 'test-previews');

// Same title/description comment convention as src/examples/. No gallery registry.
export function getTestExamples() {
  return readdirSync(testDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(resolve(testDir, entry.name, 'index.html')) && existsSync(resolve(testDir, entry.name, 'sketch.js')))
    .map(({ name: slug }) => {
      const code = readFileSync(resolve(testDir, slug, 'sketch.js'), 'utf8');
      return {
        slug,
        title: code.match(/^\/\/ title: (.+)$/m)?.[1]?.trim() ?? slug.replace(/-/g, ' '),
        description: code.match(/^\/\/ description: (.+)$/m)?.[1]?.trim() ?? '',
        href: `/test/${encodeURIComponent(slug)}/`,
        image: `/test/previews/${encodeURIComponent(slug)}.png`,
      };
    }).sort((a, b) => a.slug.localeCompare(b.slug));
}
