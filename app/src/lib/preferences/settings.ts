export type EncryptionChunkSize = 32768 | 65536 | 131072 | 262144 | 524288 | 1048576;

/**
 * Preferences for the settings page.
 */
export interface SettingsPreferenceValues {
    /** Chunk size, in bytes, to use when encrypting files */
    encryptionChunkSize: EncryptionChunkSize;
}

export const DEFAULT_SETTINGS_VALUES: SettingsPreferenceValues = {
    encryptionChunkSize: 131072,
};
