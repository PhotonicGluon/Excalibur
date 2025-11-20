import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

import viteConfig from "./vite.config";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "electron/main.ts"),
                },
                output: {
                    dir: resolve(__dirname, "out"),
                    entryFileNames: "main.mjs",
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "electron/preload.ts"),
                },
                output: {
                    dir: resolve(__dirname, "out", "preload"),
                },
            },
        },
    },
    renderer: {
        root: ".",
        resolve: viteConfig.resolve,
        plugins: viteConfig.plugins,
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "index.html"),
                },
                output: viteConfig.build!.rollupOptions!.output,
            },
        },
    },
});
