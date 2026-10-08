import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import rehypeHighlight from "rehype-highlight";
import { fileURLToPath } from "url";
import localExamples from "./scripts/local-examples.js";
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  site: "https://p5-book.vercel.app",
  integrations: [mdx(), localExamples()],
  markdown: {
    rehypePlugins: [rehypeHighlight],
  },
  vite: {
    resolve: {
      alias: { "@": src },
    },
  },
});
