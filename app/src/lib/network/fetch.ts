import { randomBytes } from "crypto";

import { generatePoPHeader } from "@lib/security/pop";

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

/**
 * Fetches a URL with a Proof of Possession (PoP) and timeout.
 *
 * @param url The URL to fetch
 * @param masterKey The master key to use for generating the PoP
 * @param options The options to pass to fetch
 * @param timeout The timeout, in seconds
 * @returns The response from fetch
 */
export async function popFetch(
    url: string,
    masterKey: Buffer,
    options?: RequestInit,
    timeout: number = 3,
): Promise<Response> {
    let popHeader;
    if (options && masterKey) {
        const method = options.method ?? "GET";
        const path = new URL(url).pathname;
        const timestamp = Math.floor(Date.now() / 1e3); // Want seconds, not milliseconds
        const nonce = randomBytes(16);
        popHeader = generatePoPHeader(masterKey, method, path, timestamp, nonce);
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
