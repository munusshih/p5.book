import { build, context } from "esbuild";
import { readFileSync } from "fs";

const watch = process.argv.includes("--watch");
const banner = readFileSync("src-lib/BANNER", "utf8").trim();

export const config = {
  entryPoints: ["src-lib/index.js"],
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: "p5.book.js",
  banner: { js: banner },
  // Keep code structure mostly intact, but strip extra whitespace in build output.
  minifyWhitespace: !watch,
  minifyIdentifiers: false,
  minifySyntax: false,
  // import './viewer.css' in viewer.js is bundled as an inlined text string
  loader: { ".css": "text" },
};

// Importing this config from Astro must not start a second build.
if (process.argv[1] && new URL(process.argv[1], "file:").href === import.meta.url) {
  if (watch) {
    const ctx = await context({ ...config, logLevel: "info" });
    await ctx.watch();
    console.log("watching src-lib/ for changes…");
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, async () => { await ctx.dispose(); process.exit(); });
    }
  } else {
    await build(config);
  }
}
