import { timedFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

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
    const response = await timedFetch(
        `${auth.serverInfo!.apiURL}/files/upload/${path}?force=${force ? "true" : "false"}`,
        {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.authInfo!.token}` },
            body: formData,
        },
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
 * @param auth The current authentication provider.
 * @param path The path to create the new directory at.
 * @param name The name of the new directory.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message.
 */
export async function mkdir(
    auth: AuthProvider,
    path: string,
    name: string,
): Promise<{ success: boolean; error?: string }> {
    const response = await timedFetch(`${auth.serverInfo!.apiURL}/files/mkdir/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.authInfo!.token}` },
        body: name,
    });
    switch (response.status) {
        case 201:
            // Continue with normal flow
            break;
        case 400:
            return { success: false, error: "Illegal or invalid directory name" };
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
