import { Preferences as PreferencesHandler } from "@capacitor/preferences";

import { LoginPreferenceValues } from "./login";

/**
 * Values stored in preferences.
 */
interface PreferenceValues extends LoginPreferenceValues {}

/**
 * Preferences manager for storing and retrieving preferences.
 */
export default class Preferences {
    /**
     * Sets the preferences.
     *
     * @param values The values to set
     */
    static async set(values: PreferenceValues) {
        for (const [key, value] of Object.entries(values)) {
            await PreferencesHandler.set({
                key: key,
                value: value!,
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
