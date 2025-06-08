import { decryptResponse } from "@lib/crypto";
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

    const directory = await decryptResponse<Directory>(response, auth.masterKey!);
    return { success: true, directory };
}

/**
 * Uploads a file to the given path.
 *
 * @param auth The current authentication provider.
 * @param path The path to upload the file to.
 * @param file The file to upload.
 * @param force If true, forces the file to be uploaded even if it already exists. If false, the
 *      request will fail if the file already exists.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message.
 */
export async function uploadFile(
    auth: AuthProvider,
    path: string,
    file: File,
    force?: boolean,
): Promise<{ success: boolean; error?: string }> {
    // Form the body data to send to server
    const formData = new FormData();
    formData.append("file", file);

    // Send the request
    const response = await fetch(`${auth.apiURL}/files/upload/${path}?force=${force ? "true" : "false"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
    });
    switch (response.status) {
        case 201:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Path not found or is not a directory" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        case 409:
            return { success: false, error: "File already exists (and `force` is not set)" };
        case 417:
            return { success: false, error: "Uploaded file needs to end with `.exef`" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
