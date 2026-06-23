import { timedFetch } from "@lib/network";

/**
 * Checks if the user exists on the server.
 *
 * @param apiURL the URL of the Excalibur API
 * @param username the username to check
 * @returns whether the user exists
 */
export async function checkUser(apiURL: string, username: string): Promise<boolean> {
    const response = await timedFetch(`${apiURL}/users/check/${username}`, {
        method: "HEAD",
    });
    if (response.status === 404) {
        return false;
    }

    return true;
}
