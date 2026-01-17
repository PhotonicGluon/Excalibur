import { popXHR } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Uploads a file to the given path.
 *
 * This function does **not** check if the file already exists. It will overwrite the file on the
 * server if it already exists.
 *
 * @param auth The current authentication provider
 * @param path The path to upload the file to
 * @param file The file to upload
 * @param signal An abort signal to cancel the request
 * @param onProgress A callback function to report progress (a value from 0 to 1)
 * @throws {Error} If there is a network error during upload
 * @throws {Error} If the upload is cancelled
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function uploadFile(
    auth: AuthProvider,
    path: string,
    file: File,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve, reject) => {
        // Set up an XHR with PoP
        const xhr = popXHR(
            `${auth.serverInfo!.apiURL}/files/upload/${path}?name=${encodeURIComponent(file.name)}&force=true`,
            auth.getToken()!,
            auth.authInfo!.key!,
            "POST",
            null, // No timeout; TODO: Determine a timeout for uploading file
        );

        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.setRequestHeader("X-Encrypted", "true");
        xhr.setRequestHeader("X-Content-Type", "application/octet-stream");

        // Set up abort signal handling
        const onSignalAbort = () => {
            xhr.abort();
        };
        if (signal) {
            signal.addEventListener("abort", onSignalAbort);
        }

        const cleanup = () => {
            if (signal) {
                signal.removeEventListener("abort", onSignalAbort);
            }
        };

        // Set up progress monitoring
        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = event.loaded / event.total;
                onProgress(progress);
                console.debug(`Uploaded ${event.loaded} / ${event.total} (${(progress * 100).toFixed(2)}%)`);
            }
        });

        xhr.addEventListener("error", () => {
            cleanup();
            reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
            cleanup();
            reject(new Error("Cancelled"));
        });

        xhr.addEventListener("load", () => {
            cleanup();
            switch (xhr.status) {
                case 201:
                    // Continue with normal flow
                    resolve({ success: true });
                    break;
                case 401:
                    resolve({ success: false, error: "Unauthorized" });
                    break;
                case 404:
                    resolve({ success: false, error: "Path not found or is not a directory" });
                    break;
                case 406:
                    resolve({ success: false, error: "Illegal or invalid path" });
                    break;
                case 409:
                    resolve({ success: false, error: "File already exists (and `force` is not set)" });
                    break;
                case 413:
                    resolve({ success: false, error: "File too large" });
                    break;
                case 414:
                    resolve({ success: false, error: "File path too long" });
                    break;
                case 417:
                    resolve({ success: false, error: "Uploaded file needs to end with `.exef`" });
                    break;
                case 422:
                    resolve({ success: false, error: "Validation error" });
                    break;
                default:
                    resolve({ success: false, error: "Unknown error" });
                    break;
            }
        });

        // Now we send the file
        xhr.send(file);
    });
}
