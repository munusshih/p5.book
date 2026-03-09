import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import rehypeHighlight from "rehype-highlight";
import { readFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from "path";

const root = fileURLToPath(new URL(".", import.meta.url));
const src = resolve(root, "src");

// Serves /p5.book.js from the repo root during dev,
// and copies it into dist/ at the end of a production build.
const p5bookPlugin = {
  name: "p5book-local",
  hooks: {
    "astro:server:setup": ({ server }) => {
      server.middlewares.use("/p5.book.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.end(readFileSync(resolve(root, "p5.book.js")));
      });
    },
    "astro:build:done": ({ dir }) => {
      copyFileSync(
        resolve(root, "p5.book.js"),
        fileURLToPath(new URL("p5.book.js", dir)),
      );
    },
  },
};

export default defineConfig({
  site: "https://p5-book.munusshih.com",
  integrations: [mdx(), p5bookPlugin],
  markdown: {
    rehypePlugins: [rehypeHighlight],
  },
  vite: {
    resolve: {
      alias: { "@": src },
    },
  },
});
