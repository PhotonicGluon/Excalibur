import { Preferences as PreferencesHandler } from "@capacitor/preferences";

import { CheckUpdatePreferenceValues } from "./check-updates";
import { FileExplorerPreferenceValues } from "./file-explorer";
import { LoginPreferenceValues } from "./login";
import { SettingsPreferenceValues } from "./settings";

/**
 * Values stored in preferences.
 */
interface PreferenceValues
    extends
        LoginPreferenceValues,
        SettingsPreferenceValues,
        CheckUpdatePreferenceValues,
        FileExplorerPreferenceValues {}

/**
 * Preferences manager for storing and retrieving preferences.
 */
export default class Preferences {
    /**
     * Sets the preferences.
     *
     * @param values the values to set
     */
    static async set(values: Partial<PreferenceValues>) {
        for (const [key, value] of Object.entries(values)) {
            if (value === undefined) {
                continue;
            }
            await PreferencesHandler.set({
                key: key,
                value: value.toString(),
            });
        }
    }

    /**
     * Gets a preference value.
     *
     * @param key the key of the preference to get
     * @returns the value of the preference. Will **always be a string**, or null if not found
     */
    static async get(key: keyof PreferenceValues): Promise<string | null> {
        const { value } = await PreferencesHandler.get({ key });
        return value;
    }
}
