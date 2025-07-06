/**
 * Preferences for the login page.
 */
export interface LoginPreferenceValues {
    /** URL to the server */
    server?: string;
    /**
     * Password for logging in.
     *
     * Will be blank if not saved.
     */
    password: string;
    /** Whether to save the password */
    savePassword: boolean;
}
