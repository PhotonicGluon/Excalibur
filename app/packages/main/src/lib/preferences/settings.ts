import { KeyStrength } from "@lib/crypto/exef";

// Types
export type Theme = "light" | "dark" | "system";
export type IconStyle = "default" | "reversed" | "outline" | "solid";
export type RowAlternatingColours = "off" | "normal" | "inverted";
export type FileSizeUnits = "si" | "iec";
export type CryptoChunkSize = 65536 | 131072 | 262144 | 524288 | 1_048_576 | 2_097_152 | 4_194_304;

/**
 * Preferences for the settings page.
 */
export interface SettingsPreferenceValues {
    // Interface
    /** Theme to use */
    theme: Theme;
    /** Icon style to use */
    iconStyle: IconStyle;
    /** Row alternating colours preset to use */
    rowAlternatingColours: RowAlternatingColours;
    /**
     * File size units to use.
     * - `si` for SI units (1 KB = 1000 bytes)
     * - `iec` for IEC units (1 KiB = 1024 bytes)
     */
    fileSizeUnits: FileSizeUnits;

    // Operations
    /** Key strength, in bits, to use when generating keys */
    cryptoKeyStrength: KeyStrength;
    /** Chunk size, in bytes, to use when encrypting/decrypting files */
    cryptoChunkSize: CryptoChunkSize;

    // Check for updates
    /** Whether to automatically check for updates */
    checkUpdate: boolean;
    /** Interval between update checks, in hours */
    checkUpdateInterval: number;
    // TODO: Add update reference URL?
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    theme: "system",
    iconStyle: "default",
    rowAlternatingColours: "off",
    cryptoKeyStrength: 128,
    cryptoChunkSize: 262144, // 256 KiB
    fileSizeUnits: "si",
    checkUpdate: true,
    checkUpdateInterval: 24,
};
