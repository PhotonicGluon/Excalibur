import { useEffect, useState } from "react";

import { KeyStrength } from "@lib/exef";
import Preferences from "@lib/preferences";
import {
    CryptoChunkSize,
    DEFAULT_SETTINGS_VALUES,
    FileSizeUnits,
    IconStyle,
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
 * @returns An object with the current settings
 */
function useProvideSettings(): SettingsProvider {
    // States
    const [theme, setTheme] = useState<Theme>(DEFAULT_SETTINGS_VALUES.theme);
    const [iconStyle, setIconStyle] = useState<IconStyle>(DEFAULT_SETTINGS_VALUES.iconStyle);
    const [rowAlternatingColours, setRowAlternatingColours] = useState<RowAlternatingColours>(
        DEFAULT_SETTINGS_VALUES.rowAlternatingColours,
    );
    const [fileSizeUnits, setFileSizeUnits] = useState<FileSizeUnits>(DEFAULT_SETTINGS_VALUES.fileSizeUnits);
    const [cryptoKeyStrength, setCryptoKeyStrength] = useState<KeyStrength>(DEFAULT_SETTINGS_VALUES.cryptoKeyStrength);
    const [cryptoChunkSize, setCryptoChunkSize] = useState<CryptoChunkSize>(DEFAULT_SETTINGS_VALUES.cryptoChunkSize);
    const [checkUpdate, setCheckUpdate] = useState<boolean>(DEFAULT_SETTINGS_VALUES.checkUpdate);
    const [checkUpdateInterval, setCheckUpdateInterval] = useState<number>(DEFAULT_SETTINGS_VALUES.checkUpdateInterval);

    function changeFunc(settings: Partial<SettingsPreferenceValues>) {
        if (settings.theme !== undefined) setTheme(settings.theme);
        if (settings.iconStyle !== undefined) setIconStyle(settings.iconStyle);
        if (settings.rowAlternatingColours !== undefined) setRowAlternatingColours(settings.rowAlternatingColours);
        if (settings.fileSizeUnits !== undefined) setFileSizeUnits(settings.fileSizeUnits);
        if (settings.cryptoKeyStrength !== undefined) setCryptoKeyStrength(settings.cryptoKeyStrength);
        if (settings.cryptoChunkSize !== undefined) setCryptoChunkSize(settings.cryptoChunkSize);
        if (settings.checkUpdate !== undefined) setCheckUpdate(settings.checkUpdate);
        if (settings.checkUpdateInterval !== undefined) setCheckUpdateInterval(settings.checkUpdateInterval);
    }

    async function saveFunc(settings: Partial<SettingsPreferenceValues>) {
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
        Preferences.get("cryptoKeyStrength").then((value) => {
            if (value) {
                console.debug(`Crypto key strength: ${value}`);
                setCryptoKeyStrength(parseInt(value) as KeyStrength);
            }
        });
        Preferences.get("cryptoChunkSize").then((value) => {
            if (value) {
                console.debug(`Crypto chunk size: ${value}`);
                setCryptoChunkSize(parseInt(value) as CryptoChunkSize);
            }
        });
        Preferences.get("checkUpdate").then((value) => {
            if (value) {
                console.debug(`Check update: ${value}`);
                setCheckUpdate(value === "true");
            }
        });
        Preferences.get("checkUpdateInterval").then((value) => {
            if (value) {
                console.debug(`Check update interval: ${value}`);
                setCheckUpdateInterval(parseInt(value));
            }
        });
    }, []);

    return {
        theme,
        iconStyle,
        rowAlternatingColours,
        fileSizeUnits,
        cryptoKeyStrength,
        cryptoChunkSize,
        checkUpdate,
        checkUpdateInterval,
        change: changeFunc,
        save: saveFunc,
    };
}
