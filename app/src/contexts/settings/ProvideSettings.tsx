import { useEffect, useState } from "react";

import Preferences from "@lib/preferences";
import { CryptoChunkSize, DEFAULT_SETTINGS_VALUES, SettingsPreferenceValues } from "@lib/preferences/settings";

import { SettingsProvider, settingsContext } from "./context";

export const ProvideSettings: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const settings = useProvideSettings();
    return <settingsContext.Provider value={settings}>{children}</settingsContext.Provider>;
};

/**
 * Hook to provide the settings to the app.
 *
 * @returns An object with the current settings.
 */
function useProvideSettings(): SettingsProvider {
    // States
    const [cryptoChunkSize, setCryptoChunkSize] = useState<CryptoChunkSize>(DEFAULT_SETTINGS_VALUES.cryptoChunkSize);

    async function saveFunc(settings: SettingsPreferenceValues) {
        console.debug("Saving settings...");
        setCryptoChunkSize(settings.cryptoChunkSize);
        await Preferences.set(settings);
    }

    // Retrieve settings
    useEffect(() => {
        Preferences.get("cryptoChunkSize").then((value) => {
            if (value) {
                console.debug(`Crypto chunk size: ${value}`);
                setCryptoChunkSize(parseInt(value) as CryptoChunkSize);
            }
        });
    }, []);

    return {
        cryptoChunkSize: cryptoChunkSize,
        save: saveFunc,
    };
}
