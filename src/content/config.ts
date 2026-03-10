import { defineCollection, z } from "astro:content";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from "path";

// Each example is a single .js file at src/examples/<slug>.js.
// The first two lines must be:
//   // title: <title>
//   // description: <description>
//
// Adding an example = adding one file. No folders, no JSON.

const examplesDir = fileURLToPath(new URL("../examples", import.meta.url));

const examplesLoader = {
    name: "js-examples",
    load: async ({ store, parseData, logger }: any) => {
        store.clear();
        const files = readdirSync(examplesDir)
            .filter((f: string) => f.endsWith(".js"))
            .sort();

        for (const file of files) {
            const id = file.replace(/\.js$/, "");
            const body = readFileSync(resolve(examplesDir, file), "utf8");
            const title =
                body.match(/^\/\/ title: (.+)$/m)?.[1]?.trim() ?? id;
            const description =
                body.match(/^\/\/ description: (.+)$/m)?.[1]?.trim() ?? "";

            const data = await parseData({ id, data: { title, description } });
            store.set({ id, data, body });
        }

        logger.info(`loaded ${files.length} examples`);
    },
};

const examples = defineCollection({
    loader: examplesLoader,
    schema: z.object({
        title: z.string(),
        description: z.string(),
    }),
});

export const collections = { examples };
