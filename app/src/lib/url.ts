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

/**
 * Encodes the path of a URL.
 *
 * @param url The URL to encode the path of
 * @returns The encoded path
 */
export function getURLEncodedPath(url: string) {
    const basePath = decodeURIComponent(new URL(url).pathname); // Decode it to just get the raw path
    const encodedPath = encodeURIComponent(basePath);
    return encodedPath.replaceAll("%2F", "/"); // Slashes are safe
}
