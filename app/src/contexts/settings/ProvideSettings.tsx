import { useEffect, useState } from "react";

import Preferences from "@lib/preferences";
import { DEFAULT_SETTINGS_VALUES, EncryptionChunkSize, SettingsPreferenceValues } from "@lib/preferences/settings";

import { settingsContext } from "./context";

export const ProvideSettings: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const settings = useProvideSettings();
    return <settingsContext.Provider value={settings}>{children}</settingsContext.Provider>;
};

/**
 * Hook to provide the settings to the app.
 *
 * @returns An object with the current settings.
 */
function useProvideSettings(): SettingsPreferenceValues {
    // States
    const [encryptionChunkSize, setEncryptionChunkSize] = useState<EncryptionChunkSize>(
        DEFAULT_SETTINGS_VALUES.encryptionChunkSize,
    );

    // Retrieve settings
    useEffect(() => {
        Preferences.get("encryptionChunkSize").then((value) => {
            if (value) {
                console.debug(`Encryption chunk size: ${value}`);
                setEncryptionChunkSize(parseInt(value) as EncryptionChunkSize);
            }
        });
    }, []);

    return {
        encryptionChunkSize,
    };
}
