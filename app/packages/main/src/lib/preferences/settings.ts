import { KeyStrength } from "@lib/crypto/exef";

// Types
export type Theme = "light" | "dark" | "system";
export type IconStyle = "default" | "reversed" | "outline" | "solid";
export type RowAlternatingColours = "off" | "normal" | "inverted";
export type FileSizeUnits = "si" | "iec";
export type FileReadChunkSize = 65536 | 131072 | 262144 | 524288 | 1_048_576 | 2_097_152 | 4_194_304;
export type CryptoChunkSizeExponent = 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22; // 16 KiB - 4 MiB

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
    /** Chunk size, in bytes, to use when reading files */
    fileReadChunkSize: FileReadChunkSize;
    /** Key strength, in bits, to use when generating keys */
    cryptoKeyStrength: KeyStrength;
    /** Chunk exponent to use when encrypting/decrypting files */
    cryptoChunkSizeExponent: CryptoChunkSizeExponent;

    // Check for updates
    /** Whether to automatically check for updates */
    checkUpdate: boolean;
    /** Interval between update checks, in hours */
    checkUpdateInterval: number;
    // TODO: Add update reference URL?
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    // Interface
    theme: "system",
    iconStyle: "default",
    rowAlternatingColours: "off",
    fileSizeUnits: "si",
    // Operations
    fileReadChunkSize: 262144, // 256 KiB
    cryptoKeyStrength: 128,
    cryptoChunkSizeExponent: 16, // 64 KiB
    // Check for updates
    checkUpdate: true,
    checkUpdateInterval: 24,
};
