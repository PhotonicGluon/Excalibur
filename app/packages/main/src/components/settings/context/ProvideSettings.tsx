import { useEffect, useState } from "react";

import { KeyStrength } from "@lib/crypto/exef";
import Preferences from "@lib/preferences";
import {
    CryptoChunkSizeExponent,
    DEFAULT_SETTINGS_VALUES,
    FileReadChunkSize,
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

    const [fileReadChunkSize, setFileReadChunkSize] = useState<FileReadChunkSize>(
        DEFAULT_SETTINGS_VALUES.fileReadChunkSize,
    );
    const [cryptoKeyStrength, setCryptoKeyStrength] = useState<KeyStrength>(DEFAULT_SETTINGS_VALUES.cryptoKeyStrength);
    const [cryptoChunkSizeExponent, setCryptoChunkSizeExponent] = useState<CryptoChunkSizeExponent>(
        DEFAULT_SETTINGS_VALUES.cryptoChunkSizeExponent,
    );

    const [checkUpdate, setCheckUpdate] = useState<boolean>(DEFAULT_SETTINGS_VALUES.checkUpdate);
    const [checkUpdateInterval, setCheckUpdateInterval] = useState<number>(DEFAULT_SETTINGS_VALUES.checkUpdateInterval);

    // Functions
    function changeFunc(settings: Partial<SettingsPreferenceValues>) {
        if (settings.theme !== undefined) setTheme(settings.theme);
        if (settings.iconStyle !== undefined) setIconStyle(settings.iconStyle);
        if (settings.rowAlternatingColours !== undefined) setRowAlternatingColours(settings.rowAlternatingColours);
        if (settings.fileSizeUnits !== undefined) setFileSizeUnits(settings.fileSizeUnits);

        if (settings.fileReadChunkSize !== undefined) setFileReadChunkSize(settings.fileReadChunkSize);
        if (settings.cryptoKeyStrength !== undefined) setCryptoKeyStrength(settings.cryptoKeyStrength);
        if (settings.cryptoChunkSizeExponent !== undefined)
            setCryptoChunkSizeExponent(settings.cryptoChunkSizeExponent);

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
        Preferences.get("iconStyle").then((value) => {
            if (value) {
                console.debug(`Icon style: ${value}`);
                setIconStyle(value as IconStyle);
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

        Preferences.get("fileReadChunkSize").then((value) => {
            if (value) {
                console.debug(`File read chunk size: ${value}`);
                setFileReadChunkSize(parseInt(value) as FileReadChunkSize);
            }
        });
        Preferences.get("cryptoKeyStrength").then((value) => {
            if (value) {
                console.debug(`Crypto key strength: ${value}`);
                setCryptoKeyStrength(parseInt(value) as KeyStrength);
            }
        });
        Preferences.get("cryptoChunkSizeExponent").then((value) => {
            if (value) {
                console.debug(`Crypto chunk exponent: ${value}`);
                setCryptoChunkSizeExponent(parseInt(value) as CryptoChunkSizeExponent);
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
        // Interface
        theme,
        iconStyle,
        rowAlternatingColours,
        fileSizeUnits,
        // Operations
        fileReadChunkSize,
        cryptoKeyStrength,
        cryptoChunkSizeExponent,
        // Updates
        checkUpdate,
        checkUpdateInterval,
        // Functions
        change: changeFunc,
        save: saveFunc,
    };
}
