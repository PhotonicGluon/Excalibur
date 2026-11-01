import ExEF from "@lib/crypto/exef";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Creates a directory in the given folder.
 *
 * @param auth the current authentication provider
 * @param parentID the ID of the folder to create the new directory in (use `.` to specify the root
 *      directory)
 * @param name the name of the new directory
 * @param obfuscateName whether to obfuscate the directory name
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the ID of the new directory
 */
export async function mkdir(
    auth: AuthProvider,
    parentID: string,
    name: string,
    obfuscateName: boolean = true,
): Promise<{ success: boolean; error?: string; id?: string }> {
    const rawName =
        obfuscateName && auth.vaultInfo!.info.obfuscatedNames ? auth.noc!.encipher(Buffer.from(name, "utf-8")) : name;

    const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(parentID, "utf-8"));
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/mkdir/${b64encodeURLSafe(encryptedID)}`,
        auth.authInfo!.key!,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
                "Content-Type": "application/octet-stream",
                "X-Encrypted": "true",
                "X-Content-Type": "text/plain",
            },
            // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
            body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(rawName, "utf-8")),
        },
    );
    switch (response.status) {
        case 201:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Parent not found or is not a directory" };
        case 406:
            return { success: false, error: "Illegal or invalid name" };
        case 409:
            return { success: false, error: "Directory already exists" };
        case 414:
            return { success: false, error: "Directory path too long" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Get the ID of the new directory
    const id = await new ExEF(auth.authInfo!.key!).decryptResponse<string>(response, false);
    if (id === null) {
        return { success: false, error: "Failed to decrypt response" };
    }

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true, id };
}
