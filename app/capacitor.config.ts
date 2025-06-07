import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.excalibur.app",
    appName: "Excalibur",
    webDir: "dist",
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
