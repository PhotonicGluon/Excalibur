/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { UserConfig, defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import { syncTheme } from "./src/theme/sync-theme.ts";

/**
 * Get aliases from tsconfig.json. This is done by reading the paths section of the tsconfig.json
 * and replacing the '*' with the path resolved from the current working directory.
 *
 * @returns A dictionary of aliases
 */
function getAliasesFromTSConfig() {
    const tsconfigStr = fs.readFileSync(path.resolve(__dirname, "tsconfig.json"), "utf-8").replace(/\/\/.*$/gm, ""); // Removing comments
    const tsconfig = JSON.parse(tsconfigStr);
    const aliases = {};
    for (const [key, value] of Object.entries(tsconfig.compilerOptions.paths)) {
        const find = key.replace(/\/\*/g, "");
        const replace = value[0].replace(/\/\*/g, "");
        aliases[find] = path.resolve(__dirname, replace);
    }
    return aliases;
}

// https://vitejs.dev/config/
export const viteConfig: UserConfig = {
    plugins: [
        react({}),
        tailwindcss(),
        nodePolyfills({
            include: ["buffer", "crypto", "stream", "util", "vm"],
            overrides: {
                buffer: "buffer/",
                // crypto: "crypto-browserify",
                // stream: "stream-browserify",
                // util: "util/",
                vm: "vm-browserify",
            },
        }),
        syncTheme(),
    ],
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
        chunkSizeWarningLimit: 750, // 750 kB
        rolldownOptions: {
            output: {
                manualChunks(id: string) {
                    if (!process || !process.env || process.env.NODE_ENV !== "production") {
                        return "chunk";
                    }

                    // For production, we'll split the chunks better
                    if (/css$/.test(id)) {
                        // See https://github.com/vitejs/vite/issues/21903.
                        // For now we'll combine all the stylesheets into one chunk.
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
