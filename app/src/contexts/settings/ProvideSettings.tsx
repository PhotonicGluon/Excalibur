import { useEffect, useState } from "react";

import Preferences from "@lib/preferences";
import {
    CryptoChunkSize,
    DEFAULT_SETTINGS_VALUES,
    FileSizeUnits,
    RowAlternatingColours,
    SettingsPreferenceValues,
    Theme,
} from "@lib/preferences/settings";

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
    const [theme, setTheme] = useState<Theme>(DEFAULT_SETTINGS_VALUES.theme);
    const [rowAlternatingColours, setRowAlternatingColours] = useState<RowAlternatingColours>(
        DEFAULT_SETTINGS_VALUES.rowAlternatingColours,
    );
    const [fileSizeUnits, setFileSizeUnits] = useState<FileSizeUnits>(DEFAULT_SETTINGS_VALUES.fileSizeUnits);
    const [cryptoChunkSize, setCryptoChunkSize] = useState<CryptoChunkSize>(DEFAULT_SETTINGS_VALUES.cryptoChunkSize);

    function changeFunc(settings: SettingsPreferenceValues) {
        setTheme(settings.theme);
        setRowAlternatingColours(settings.rowAlternatingColours);
        setFileSizeUnits(settings.fileSizeUnits);
        setCryptoChunkSize(settings.cryptoChunkSize);
    }

    async function saveFunc(settings: SettingsPreferenceValues) {
        console.debug("Saving settings...");
        changeFunc(settings);
        await Preferences.set(settings);
    }

    // Retrieve settings
    useEffect(() => {
        Preferences.get("theme").then((value) => {
            if (value) {
                console.debug(`Theme: ${value}`);
                setTheme(value as Theme);
            }
        });
        Preferences.get("rowAlternatingColours").then((value) => {
            if (value) {
                console.debug(`Row alternating colours: ${value}`);
                setRowAlternatingColours(value as RowAlternatingColours);
            }
        });
        Preferences.get("fileSizeUnits").then((value) => {
            if (value) {
                console.debug(`File size units: ${value}`);
                setFileSizeUnits(value as FileSizeUnits);
            }
        });
        Preferences.get("cryptoChunkSize").then((value) => {
            if (value) {
                console.debug(`Crypto chunk size: ${value}`);
                setCryptoChunkSize(parseInt(value) as CryptoChunkSize);
            }
        });
    }, []);

    return {
        theme,
        rowAlternatingColours,
        fileSizeUnits,
        cryptoChunkSize,
        change: changeFunc,
        save: saveFunc,
    };
}
