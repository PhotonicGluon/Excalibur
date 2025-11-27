import { Preferences as PreferencesHandler } from "@capacitor/preferences";

import { LoginPreferenceValues } from "./login";
import { SettingsPreferenceValues } from "./settings";

/**
 * Values stored in preferences.
 */
interface PreferenceValues extends LoginPreferenceValues, SettingsPreferenceValues {}

/**
 * Preferences manager for storing and retrieving preferences.
 */
export default class Preferences {
    /**
     * Sets the preferences.
     *
     * @param values The values to set
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
     * @param key The key of the preference to get
     * @returns The value of the preference. Will **always** be a string or null
     */
    static async get(key: keyof PreferenceValues): Promise<string | null> {
        const { value } = await PreferencesHandler.get({ key });
        return value;
    }
}
