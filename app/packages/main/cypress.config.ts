import { defineConfig } from "cypress";
import packageInfo from "../../package.json";

const BASE_URL = "http://localhost:5173";
const SERVER_URL = "http://127.0.0.1:8989";

export default defineConfig({
    keystrokeDelay: 10,

    e2e: {
        // Base configurations
        baseUrl: BASE_URL,
        setupNodeEvents(on, config) {
            on("before:run", async () => {
                // Check compatibility with server
                const compatibilityResponse = await fetch(
                    `${SERVER_URL}/api/well-known/compatible?version=${packageInfo.version}`,
                );
                const isCompatible: boolean = await compatibilityResponse.json();
                if (!isCompatible) {
                    // For ease of debugging, get the server's version too
                    const serverVersionResponse = await fetch(`${SERVER_URL}/api/well-known/version`);
                    const serverVersion: string = (await serverVersionResponse.json())["version"];

                    throw new Error(
                        `Current client version (${packageInfo.version}) is NOT compatible with the server's version (${serverVersion}).`,
                    );
                }
            });
        },
        expose: {
            serverURL: SERVER_URL,
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
