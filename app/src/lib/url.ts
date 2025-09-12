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

export function getURLEncodedPath(url: string) {
    return encodeURIComponent(new URL(url).pathname).replaceAll("%2F", "/"); // Slashes are safe
}
