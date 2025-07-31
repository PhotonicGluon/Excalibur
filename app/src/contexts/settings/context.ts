import { createContext, useContext } from "react";

import { SettingsPreferenceValues } from "@lib/preferences/settings";

export const settingsContext = createContext<SettingsPreferenceValues>(null!);

/**
 * Hook to get the current settings.
 *
 * @returns The current settings.
 */
export function useSettings(): SettingsPreferenceValues {
    return useContext(settingsContext);
}
