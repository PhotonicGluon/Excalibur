import { heartbeat as _heartbeat } from "@root/src/lib/network";

/**
 * Heartbeat checking function.
 *
 * @param apiURL API URL
 * @param token Authentication token
 * @param retryCount Number of retries
 * @param retryInterval Interval between retries, in seconds
 * @returns Whether the heartbeat was successful
 */
export async function heartbeat(
    apiURL: string,
    token: string,
    retryCount: number = 3,
    retryInterval: number = 5,
): Promise<boolean> {
    // Retry with intervals to make sure that the heartbeat is successful
    for (let i = 0; i < retryCount; i++) {
        const { success: connected, authValid: authenticated } = await _heartbeat(apiURL, token);
        if (authenticated === false) {
            return false;
        }
        if (connected && authenticated) {
            return true;
        }
        console.debug(`Heartbeat failed (${i + 1}/${retryCount})`);
        if (i !== retryCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryInterval * 1000));
        }
    }
    return false;
}
