import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Checks if a path exists.
 *
 * @param auth The current authentication provider.
 * @param path The path to check.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or the type of the path.
 */
export async function checkPath(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; type?: "file" | "directory" }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/check/path/${path}`, auth.authInfo!.key!, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Path not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 414:
            return { success: false, error: "Path too long" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, type: response.status === 200 ? "file" : "directory" };
}

/**
 * Checks the existence of a directory, and whether it is empty.
 *
 * @param auth The current authentication provider.
 * @param path The path to check.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message.
 */
export async function checkDir(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; isEmpty?: boolean }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/check/dir/${path}`, auth.authInfo!.key!, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Directory not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, isEmpty: response.status === 200 };
}
