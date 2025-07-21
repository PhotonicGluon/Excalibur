/**
 * Validate a URL string.
 * @param url The URL to validate
 *
 * @returns True if the URL is valid, false otherwise
 */
export function validateURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
