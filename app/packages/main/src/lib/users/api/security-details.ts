import { AuthProtocol } from "@lib/auth/enums";
import { timedFetch } from "@lib/network";
import { b64decode } from "@lib/util";

/**
 * Retrieves the security details from the server.
 *
 * @param apiURL the URL of the API server to query
 * @param username the username to retrieve security details for
 * @returns a promise which resolves to an object representing the security details of the user. If
 *      the user does not exist, the promise resolves to an object with `success` set to `false` and
 *      an error message
 */
export async function getSecurityDetails(
    apiURL: string,
    username: string,
): Promise<{
    success: boolean;
    aukSalt?: Buffer;
    authProtocol?: AuthProtocol;
    error?: string;
}> {
    const response = await timedFetch(`${apiURL}/users/security/${username}`, {
        method: "GET",
    });
    switch (response.status) {
        case 200:
            break;
        case 404:
            return { success: false, error: "Security details file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return {
        success: true,
        aukSalt: b64decode(data["auk_salt"]),
        authProtocol: data["auth_protocol"] as AuthProtocol,
    };
}
