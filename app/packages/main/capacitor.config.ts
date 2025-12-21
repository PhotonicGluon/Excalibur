import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.excalibur.app",
    appName: "Excalibur",
    webDir: "dist",
    android: {
        path: "../android",
    },
    server: {
        androidScheme: "http",
    },
    plugins: {
        Keyboard: {
            resizeOnFullScreen: true,
        },
        SystemBars: {
            insetsHandling: "css",
        },
    },
};

export default config;
