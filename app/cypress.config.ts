import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        // Base configurations
        baseUrl: "http://localhost:5173",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        // Pixel 7
        viewportWidth: 412,
        viewportHeight: 915,
    },
});
