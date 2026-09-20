import { defineConfig } from "cypress";

export default defineConfig({
    keystrokeDelay: 10,

    e2e: {
        // Base configurations
        baseUrl: "http://localhost:5173",
        expose: {
            serverURL: "http://127.0.0.1:8989",
        },
        // Pixel 7
        viewportWidth: 412,
        viewportHeight: 915,
    },

    component: {
        devServer: {
            framework: "react",
            bundler: "vite",
        },
    },
});
