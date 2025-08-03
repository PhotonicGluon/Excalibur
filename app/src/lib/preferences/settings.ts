export type Theme = "light" | "dark" | "system";
export type CryptoChunkSize = 32768 | 65536 | 131072 | 262144 | 524288 | 1048576;

/**
 * Preferences for the settings page.
 */
export interface SettingsPreferenceValues {
    /** Theme to use */
    theme: Theme;
    /** Chunk size, in bytes, to use when encrypting/decrypting files */
    cryptoChunkSize: CryptoChunkSize;
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    theme: "system",
    cryptoChunkSize: 131072, // 128 KiB
};
