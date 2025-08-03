import ExEF from "@lib/exef";
import { Directory } from "@lib/files/structures";

import { AuthProvider } from "@contexts/auth";

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

/**
 * Downloads a file from the server.
 *
 * @param auth The current authentication provider.
 * @param path The path to the file to download.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message, or the file size and ReadableStream of the decrypted file data.
 */
export async function downloadFile(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; fileSize?: number; dataStream?: ReadableStream<Uint8Array> }> {
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

    const fileSize = parseInt(response.headers.get("Content-Length")!) - ExEF.additionalSize;
    const dataStream = ExEF.decryptStream(auth.e2eeKey!, response.body!);
    return { success: true, fileSize: fileSize, dataStream: dataStream };
}
