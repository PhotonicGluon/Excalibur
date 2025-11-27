import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

import viteConfig from "../main/vite.config";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "main.ts"),
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
                    index: resolve(__dirname, "preload.ts"),
                },
                output: {
                    dir: resolve(__dirname, "out", "preload"),
                },
            },
        },
    },
    renderer: {
        root: "../main",
        resolve: viteConfig.resolve,
        plugins: viteConfig.plugins,
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "../main/index.html"),
                },
                output: viteConfig.build!.rollupOptions!.output,
            },
        },
    },
});
