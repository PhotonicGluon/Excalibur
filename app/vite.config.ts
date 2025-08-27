/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Get aliases from tsconfig.json. This is done by reading the paths section of the tsconfig.json
 * and replacing the '*' with the path resolved from the current working directory.
 *
 * @returns A dictionary of aliases
 */
function getAliasesFromTSConfig() {
    const tsconfigStr = fs.readFileSync("./tsconfig.json", "utf-8").replace(/\/\/.*$/gm, ""); // Removing comments
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
export default defineConfig({
    plugins: [react(), legacy(), tailwindcss(), nodePolyfills({ include: ["crypto", "stream", "util", "vm"] })],
    resolve: {
        alias: getAliasesFromTSConfig(),
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/vitest-setup.ts"],
    },
    server: { watch: { ignored: ["**/android"] } },
});
