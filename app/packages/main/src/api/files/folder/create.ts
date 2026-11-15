import ExEF from "@lib/crypto/exef";
import { computeNameTag, encryptName } from "@lib/files/names/crypto";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";
import { randID } from "@lib/auth/util";

/**
 * Creates a directory in the given folder.
 *
 * @param auth the current authentication provider
 * @param parentID the ID of the folder to create the new directory in. This must be the folder's real
 *      ID (so not `.`), since names are tagged together with their parent's ID
 * @param name the name of the new directory
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the ID of the new directory
 */
export async function mkdir(
    auth: AuthProvider,
    parentID: string,
    name: string,
): Promise<{ success: boolean; error?: string; id?: string }> {
    const keys = auth.vaultInfo!.nameKeys;

    // Compute item details
    const id = randID();
    let newItem: { id: string; name_enc: string; name_tag: string };
    try {
        newItem = {
            id,
            name_enc: (await encryptName(keys, id, name)).toString("base64"),
            name_tag: computeNameTag(keys, parentID, name).toString("base64"),
        };
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }
    const itemDetails = JSON.stringify(newItem);

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
                "X-Content-Type": "application/json",
            },
            // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
            body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(itemDetails, "utf-8")),
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
        case 409:
            return { success: false, error: "Directory already exists" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true, id };
}
