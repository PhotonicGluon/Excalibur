/**
 * Preferences related to checking for updates.
 */
export interface CheckUpdatePreferenceValues {
    /** Timestamp of the last time a check for updates was performed */
    lastUpdateCheck: number;
    /** List of update versions that have been ignored */
    ignoredUpdateVersions: string[];
}
