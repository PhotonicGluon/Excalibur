import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.excalibur.app",
    appName: "Excalibur",
    webDir: "dist",
    server: {
        androidScheme: "http",
    },
};

export default config;
