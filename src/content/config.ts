import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Each example lives at src/examples/<slug>/meta.json.
// The glob loader gives each entry an id of "<slug>/meta";
// we strip "/meta" in pages to recover the slug.
const examples = defineCollection({
    loader: glob({ pattern: "*/meta.json", base: "./src/examples" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
    }),
});

export const collections = { examples };
