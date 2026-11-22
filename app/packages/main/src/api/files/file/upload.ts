import { randID } from "@lib/auth/util";
import ExEF from "@lib/crypto/exef";
import { computeNameTag, encryptName } from "@lib/files/names";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popXHR } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Uploads a file to the given folder.
 *
 * This function does **not** check if the file already exists. It will overwrite the file on the
 * server if it already exists.
 *
 * @param auth the current authentication provider
 * @param parentID the ID of the folder to upload the file to
 * @param name the name of the file
 * @param file the (already encrypted) contents of the file to upload
 * @param signal an abort signal to cancel the request
 * @param onProgress a callback function to report progress (a value from 0 to 1)
 * @throws {Error} if there is a network error during upload
 * @throws {Error} if the upload is cancelled
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message, and the ID of the uploaded file
 */
export async function uploadFile(
    auth: AuthProvider,
    parentID: string,
    name: string,
    file: Blob,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
): Promise<{ success: boolean; error?: string; id?: string }> {
    const keys = auth.vaultInfo!.nameKeys;

    // Compute item details
    const id = randID();
    const nameEnc = await encryptName(keys, id, name);
    if (nameEnc.length > auth.authInfo!.maxEncryptedNameSize) {
        return { success: false, error: "Name is too long" };
    }
    const nameTag = computeNameTag(keys, parentID, name);
    const itemDetails = `${id}:${b64encodeURLSafe(nameEnc)}:${b64encodeURLSafe(nameTag)}`;

    // Encrypt data
    const encryptedParentID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
        Buffer.from(parentID, "utf-8"),
    );
    const encryptedItemDetails = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
        Buffer.from(itemDetails, "utf-8"),
    );

    return new Promise((resolve, reject) => {
        // Set up an XHR with PoP
        const xhr = popXHR(
            `${auth.serverInfo!.apiURL}/files/upload/${b64encodeURLSafe(encryptedParentID)}/${b64encodeURLSafe(encryptedItemDetails)}?force=true`,
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
                    // File sent successfully; trigger a sync and report success
                    scheduleMerkleSync(auth);
                    resolve({ success: true, id });
                    break;
                case 401:
                    resolve({ success: false, error: "Unauthorized" });
                    break;
                case 404:
                    resolve({ success: false, error: "Parent not found or is not a directory" });
                    break;
                case 400:
                    resolve({ success: false, error: "Malformed item details" });
                    break;
                case 409:
                    resolve({ success: false, error: "File already exists (and `force` is not set)" });
                    break;
                case 413:
                    resolve({ success: false, error: "File too large" });
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
