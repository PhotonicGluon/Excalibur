import ExEF from "@lib/exef";
import { Directory } from "@lib/files/structures";

import { AuthProvider } from "@components/auth/ProvideAuth";

/**
 * Lists the contents of a directory.
 *
 * @param auth The current authentication provider.
 * @param path The path to list.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or the directory object.
 */
export async function listdir(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; directory?: Directory; error?: string }> {
    const response = await fetch(`${auth.apiURL}/files/list/${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Path not found or is not a directory" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const directory = await ExEF.decryptResponse<Directory>(auth.e2eeKey!, response);
    return { success: true, directory };
}

export async function downloadFile(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; data?: Uint8Array }> {
    const response = await fetch(`${auth.apiURL}/files/download/${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Path not found or is not a file" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            throw new Error("Unknown error");
    }

    const data = await ExEF.decryptResponse<Uint8Array>(auth.e2eeKey!, response, false);
    return { success: true, data: data };
}
