/**
 * Checks if the given URL is reachable.
 *
 * @param url The URL to check.
 * @param timeout The timeout in seconds.
 * @returns `true` if the URL is reachable, `false` otherwise.
 */
export async function checkConnection(url: string, timeout: number = 5): Promise<boolean> {
    // Try to connect
    try {
        await fetch(url, { signal: AbortSignal.timeout(timeout * 1000) });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
