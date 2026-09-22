/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { UserConfig, defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import { syncTheme } from "./src/theme/sync-theme.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get aliases from the `tsconfig.json` file. This is done by reading the paths section of the
 * configuration file and replacing the '*' with the path resolved from the current working
 * directory.
 *
 * @returns a dictionary of aliases
 */
function getAliasesFromTSConfig() {
    const tsconfigStr = fs.readFileSync(path.resolve(__dirname, "tsconfig.json"), "utf-8").replace(/\/\/.*$/gm, ""); // Removing comments
    const tsconfig = JSON.parse(tsconfigStr);
    const aliases: Record<string, string> = {};
    for (const [key, value] of Object.entries(tsconfig.compilerOptions.paths)) {
        const find = key.replace(/\/\*/g, "");
        const replace = value[0].replace(/\/\*/g, "");
        aliases[find] = path.resolve(__dirname, replace);
    }
    return aliases;
}

export const viteConfig: UserConfig = {
    plugins: [
        react({}),
        tailwindcss(),
        nodePolyfills({
            include: ["buffer", "crypto", "stream", "util", "vm"],
        }),
        syncTheme(),
    ],
    define: {
        global: "globalThis",
    },
    resolve: {
        alias: getAliasesFromTSConfig(),
    },
    test: {
        globals: true,
    },
    server: {
        warmup: { clientFiles: ["./src/components/**/*"] },
    },
    build: {
        rolldownOptions: {
            output: {
                manualChunks(id: string) {
                    if (!process || !process.env || process.env.NODE_ENV !== "production") {
                        return "chunk";
                    }

                    // For production, we'll split the chunks better
                    if (/css$/.test(id)) {
                        // (Last checked for 0.8.2)
                        // CSS bundle order is (still) incorrect; see:
                        // - https://github.com/vitejs/vite/issues/22301
                        // - https://github.com/vitejs/vite/issues/21903
                        //
                        // For now we'll combine all the stylesheets into one chunk ("style.css").
                        // This isn't that bad, but it would be better to split them up.
                        return "style";
                    }

                    if (id.includes("node_modules")) {
                        let importPath = id.toString().split("node_modules/")[1];
                        if (importPath.startsWith(".pnpm")) {
                            importPath = importPath.split(".pnpm/")[1];
                        }
                        const packageID = importPath.split("/")[0];
                        return packageID;
                    }
                },
            },
        },
    },
};
export default defineConfig(viteConfig);
