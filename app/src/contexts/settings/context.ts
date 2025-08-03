import { createContext, useContext } from "react";

import { SettingsPreferenceValues } from "@lib/preferences/settings";

export interface SettingsProvider extends SettingsPreferenceValues {
    /**
     * Saves the current settings to storage.
     */
    save: (settings: SettingsPreferenceValues) => Promise<void>;
}

export const settingsContext = createContext<SettingsProvider>(null!);

/**
 * Hook to get the current settings.
 *
 * @returns The current settings.
 */
export function useSettings(): SettingsProvider {
    return useContext(settingsContext);
}
