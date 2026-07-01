import { generatePoPHeader } from "@lib/auth/pop";
import { getURLEncodedPath } from "@lib/url";

/**
 * Fetches a URL with a timeout.
 *
 * @param url The URL to fetch
 * @param options The options to pass to fetch
 * @param timeout The timeout, in seconds. If null, no timeout is applied
 * @returns The response from fetch
 * @throws {TypeError} If the fetch fails
 */
export async function timedFetch(url: string, options?: RequestInit, timeout: number | null = 3): Promise<Response> {
    return globalThis.fetch(url, {
        ...options,
        signal: timeout ? AbortSignal.timeout(timeout * 1000) : undefined,
    });
}

/**
 * Sets up an `XMLHttpRequest` for sending a request with a timeout.
 *
 * @param url The URL to fetch
 * @param method HTTP method
 * @param timeout The timeout, in seconds. If null or 0, no timeout is applied
 * @returns XMLHttpRequest with the timeout
 */
export function timedXHR(url: string, method: string, timeout: number | null = 3): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeout ? timeout * 1000 : 0;
    return xhr;
}

/**
 * Fetches a URL with a Proof of Possession (PoP) and timeout.
 *
 * @param url the URL to fetch
 * @param masterKey the master key to use for generating the PoP
 * @param options the options to pass to fetch
 * @param timeout the timeout, in seconds. If null, no timeout is applied
 * @returns the response from fetch
 * @throws {TypeError} if the fetch fails
 */
export async function popFetch(
    url: string,
    masterKey: Buffer,
    options?: RequestInit,
    timeout: number | null = 5,
): Promise<Response> {
    let popHeader;
    if (options && masterKey) {
        const method = options.method ?? "GET";
        const path = getURLEncodedPath(url);
        popHeader = generatePoPHeader(masterKey, method, path);
    }

    let headers = options?.headers;
    if (popHeader) {
        headers = {
            "X-SRP-PoP": popHeader,
            ...options?.headers,
        };
    }

    return timedFetch(url, { ...options, headers }, timeout);
}

/**
 * Sets up an `XMLHttpRequest` for sending a request with a Proof of Possession (PoP) and timeout.
 *
 * @param url The URL to fetch
 * @param token The authentication token to use
 * @param masterKey The master key to use for generating the PoP
 * @param method HTTP method
 * @param timeout The timeout, in seconds. If null or 0, no timeout is applied
 * @returns XMLHttpRequest with the timeout and PoP
 */
export function popXHR(
    url: string,
    token: string,
    masterKey: Buffer,
    method: string,
    timeout: number | null = 5,
): XMLHttpRequest {
    const xhr = timedXHR(url, method, timeout);

    if (masterKey) {
        const path = getURLEncodedPath(url);
        const popHeader = generatePoPHeader(masterKey, method, path);

        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("X-SRP-PoP", popHeader);
    }

    return xhr;
}
