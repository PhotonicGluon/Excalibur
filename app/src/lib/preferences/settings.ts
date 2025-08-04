// Types
export type Theme = "light" | "dark" | "system";
export type RowAlternatingColours = "off" | "normal" | "inverted";
export type FileSizeUnits = "si" | "iec";
export type CryptoChunkSize = 32768 | 65536 | 131072 | 262144 | 524288 | 1048576;

/**
 * Preferences for the settings page.
 */
export interface SettingsPreferenceValues {
    // Interface
    /** Theme to use */
    theme: Theme;
    rowAlternatingColours: RowAlternatingColours;
    /**
     * File size units to use.
     * - `si` for SI units (1 KB = 1000 bytes)
     * - `iec` for IEC units (1 KiB = 1024 bytes)
     */
    fileSizeUnits: FileSizeUnits;

    // Operations
    /** Chunk size, in bytes, to use when encrypting/decrypting files */
    cryptoChunkSize: CryptoChunkSize;
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    theme: "system",
    rowAlternatingColours: "off",
    cryptoChunkSize: 262144, // 256 KiB
    fileSizeUnits: "si",
};
