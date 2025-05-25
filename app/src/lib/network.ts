/**
 * Checks if the given URL is reachable.
 *
 * @param url The URL to check.
 * @returns `true` if the URL is reachable, `false` otherwise.
 */
export async function checkConnection(url: string): Promise<boolean> {
    // Try to connect
    try {
        await fetch(url);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
