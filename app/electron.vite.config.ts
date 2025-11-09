import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

import viteConfig from "./vite.config";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "electron/main/index.ts"),
                },
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve(__dirname, "electron/preload/index.ts"),
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
