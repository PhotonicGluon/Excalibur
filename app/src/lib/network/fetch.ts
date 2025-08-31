/**
 * Fetches a URL with a timeout.
 *
 * @param url The URL to fetch
 * @param options The options to pass to fetch
 * @param timeout The timeout, in seconds
 * @returns The response from fetch
 */
export async function timedFetch(url: string, options?: RequestInit, timeout: number = 3): Promise<Response> {
    return globalThis.fetch(url, {
        signal: AbortSignal.timeout(timeout * 1000),
        ...options,
    });
}
