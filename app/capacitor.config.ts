import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.excalibur.app",
    appName: "Excalibur",
    webDir: "dist",
    android: {
        // See also: https://developer.android.com/reference/android/R.attr#windowOptOutEdgeToEdgeEnforcement
        adjustMarginsForEdgeToEdge: "auto",
    },
    server: {
        androidScheme: "http",
    },
};

export default config;
