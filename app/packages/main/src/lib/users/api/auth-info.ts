import { AuthProtocol } from "@lib/auth/enums";
import { timedFetch } from "@lib/network";

/**
 * Retrieves the authentication info of the user from the server.
 *
 * @param apiURL the URL of the API server to query
 * @param username the username to retrieve authentication info for
 * @returns a promise which resolves to an object representing the authentication info of the user. If
 *      the user does not exist, the promise resolves to an object with `success` set to `false` and
 *      an error message
 */
export async function getAuthInfo(
    apiURL: string,
    username: string,
): Promise<{
    success: boolean;
    authProtocol?: AuthProtocol;
    error?: string;
}> {
    const response = await timedFetch(`${apiURL}/auth/info/${username}`, {
        method: "GET",
    });
    switch (response.status) {
        case 200:
            break;
        case 404:
            return { success: false, error: "User not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return {
        success: true,
        authProtocol: data["auth_protocol"] as AuthProtocol,
    };
}
