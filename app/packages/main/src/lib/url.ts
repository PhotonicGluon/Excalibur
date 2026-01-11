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
 * Characters that are always safe to use in a URL, as defined by [RFC3986
 * ](https://datatracker.ietf.org/doc/html/rfc3986#appendix-A)
 */
const ALWAYS_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789" + "_.-~";

/**
 * Implementation of Python's `urllib.quote()` function.
 *
 * This function follows [RFC3986's list of (un)reserved characters
 * ](https://datatracker.ietf.org/doc/html/rfc3986#appendix-A) that needs to be encoded.
 *
 * @param str String to encode
 * @param safe Characters that should not be encoded
 * @returns The encoded string
 */
export function quote(str: string, safe: string = "/") {
    const safeChars = ALWAYS_SAFE + safe;
    const encoder = new TextEncoder();

    let result = "";
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (safeChars.includes(char)) {
            result += char;
        } else {
            result += encoder
                .encode(char)
                .reduce((hex, byte) => hex + "%" + byte.toString(16).padStart(2, "0"), "")
                .toUpperCase();
        }
    }
    return result;
}

/**
 * Implementation of Python's `urllib.quotePlus()` function.
 *
 * This function follows [RFC3986's list of (un)reserved characters
 * ](https://datatracker.ietf.org/doc/html/rfc3986#appendix-A) that needs to be encoded. This also
 * converts spaces to pluses and removes the `safe` default from {@link quote}.
 *
 * @param str The string to encode
 * @param safe Characters that should not be encoded
 * @returns The encoded string
 */
export function quotePlus(str: string, safe: string = "") {
    if (!str.includes(" ")) {
        return quote(str, safe);
    }
    return quote(str, safe + " ").replaceAll(" ", "+");
}

/**
 * Encodes the path of a URL.
 *
 * @param url The URL to encode the path of
 * @returns The encoded path
 */
export function getURLEncodedPath(url: string) {
    const basePath = decodeURIComponent(new URL(url).pathname); // Decode it to just get the raw path
    return quote(basePath);
}
