// Types
export type Theme = "light" | "dark" | "system";
export type CryptoChunkSize = 32768 | 65536 | 131072 | 262144 | 524288 | 1048576;
export type FileSizeUnits = "si" | "iec";

/**
 * Preferences for the settings page.
 */
export interface SettingsPreferenceValues {
    /** Theme to use */
    theme: Theme;
    /** Chunk size, in bytes, to use when encrypting/decrypting files */
    cryptoChunkSize: CryptoChunkSize;
    /**
     * File size units to use.
     * - `si` for SI units (1 KB = 1000 bytes)
     * - `iec` for IEC units (1 KiB = 1024 bytes)
     */
    fileSizeUnits: FileSizeUnits;
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    theme: "system",
    cryptoChunkSize: 131072, // 128 KiB
    fileSizeUnits: "si",
};
