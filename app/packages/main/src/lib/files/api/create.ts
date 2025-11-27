import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Uploads a file to the given path.
 *
 * @param auth The current authentication provider
 * @param path The path to upload the file to
 * @param file The encrypted file object to upload. Note that this is a *doubly-encrypted* file:
 *      once using the vault key and once using the E2EE key
 * @param force If true, forces the file to be uploaded even if it already exists. If false, the
 *      request will fail if the file already exists
 * @param signal An abort signal to cancel the request
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function uploadFile(
    auth: AuthProvider,
    path: string,
    file: File,
    force?: boolean,
    signal?: AbortSignal,
): Promise<{ success: boolean; error?: string }> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/upload/${path}?name=${encodeURIComponent(file.name)}&force=${force ? "true" : "false"}`,
        auth.authInfo!.key!,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
                "Content-Type": "application/octet-stream",
                "X-Encrypted": "true",
                "X-Content-Type": "application/octet-stream",
            },
            body: file,
            signal,
        },
        null, // No timeout; TODO: Determine a timeout for uploading file
    );
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
        case 413:
            return { success: false, error: "File too large" };
        case 414:
            return { success: false, error: "File path too long" };
        case 417:
            return { success: false, error: "Uploaded file needs to end with `.exef`" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}

/**
 * Creates a directory at the given path.
 *
 * @param auth The current authentication provider
 * @param path The path to create the new directory at
 * @param name The name of the new directory
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function mkdir(
    auth: AuthProvider,
    path: string,
    name: string,
): Promise<{ success: boolean; error?: string }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/mkdir/${path}`, auth.authInfo!.key!, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
        body: name,
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
            return { success: false, error: "Directory already exists" };
        case 414:
            return { success: false, error: "Directory path too long" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true };
}
