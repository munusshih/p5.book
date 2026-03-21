import { build } from "esbuild";
import { readFileSync } from "fs";

const watch = process.argv.includes("--watch");
const banner = readFileSync("src-lib/BANNER", "utf8").trim();

const config = {
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

if (watch) {
  const ctx = await build({ ...config, logLevel: "info" });
  // esbuild v0.17+ context API
  if (ctx && typeof ctx.watch === "function") {
    await ctx.watch();
    console.log("watching src-lib/ for changes…");
  }
} else {
  await build(config);
}
