import { defineConfig } from "electron-vite";
import { resolve } from "path";

import viteConfig from "../main/vite.config";

export default defineConfig({
    main: {
        build: {
            externalizeDeps: true,
            rolldownOptions: {
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
        build: {
            externalizeDeps: true,
            rolldownOptions: {
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
            rolldownOptions: {
                input: {
                    index: resolve(__dirname, "../main/index.html"),
                },
                output: viteConfig.build!.rolldownOptions!.output,
            },
        },
    },
});
