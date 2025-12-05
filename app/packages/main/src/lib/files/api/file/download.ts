import ExEF from "@lib/exef";
import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Downloads a file from the server.
 *
 * @param auth The current authentication provider
 * @param path The path to the file to download
 * @param signal An abort signal to cancel the request
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message, or the file size, a boolean indicating whether the file is encrypted using the
 *      E2EE key, and a ReadableStream of data. Note that this stream may be encrypted using the
 *      vault key only (`e2ee = false`) or double-encrypted using both the vault key and the E2EE
 *      key (`e2ee = true`)
 */
export async function downloadFile(
    auth: AuthProvider,
    path: string,
    signal?: AbortSignal,
): Promise<{
    success: boolean;
    error?: string;
    fileSize?: number;
    e2ee?: boolean;
    dataStream?: ReadableStream<Uint8Array>;
}> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/download/${path}`,
        auth.authInfo!.key!,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${auth.getToken()}` },
            cache: "no-store",
            signal,
        },
        null, // No timeout; TODO: Determine a timeout for downloading file
    );
    // TODO: Handle abort?
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
    return {
        success: true,
        fileSize: fileSize,
        e2ee: response.headers.get("X-Encrypted") === "true",
        dataStream: response.body!,
    };
}
