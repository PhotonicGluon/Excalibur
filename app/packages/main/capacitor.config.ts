import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.excalibur.app",
    appName: "Excalibur",
    webDir: "dist",
    android: {
        path: "../android",
        adjustMarginsForEdgeToEdge: "auto", // See also: https://developer.android.com/reference/android/R.attr#windowOptOutEdgeToEdgeEnforcement
    },
    server: {
        androidScheme: "http",
    },
    plugins: {
        Keyboard: {
            resizeOnFullScreen: true,
        },
    },
};

export default config;
