import ExEF from "@lib/crypto/exef";
import { computeNameTag, encryptName } from "@lib/files/names";
import { scheduleMerkleSync } from "@lib/merkle";
import { b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * Encrypts an item's new name and computes its tag.
 *
 * @param auth the current authentication provider
 * @param itemID the ID of the item
 * @param parentID the real ID of the folder that contains the item
 * @param name the new name for the item
 * @returns the encrypted name and name tag, in Base64
 * @throws {Error} if the name is too long
 */
async function encryptNewName(
    auth: AuthProvider,
    itemID: string,
    parentID: string,
    name: string,
): Promise<{ name_enc: string; name_tag: string }> {
    const keys = auth.vaultInfo!.nameKeys;

    const nameEnc = await encryptName(keys, itemID, name);
    if (nameEnc.length > auth.authInfo!.maxEncryptedNameSize) {
        throw new Error("Name is too long");
    }

    return {
        name_enc: nameEnc.toString("base64"),
        name_tag: computeNameTag(keys, parentID, name).toString("base64"),
    };
}

/**
 * Renames the item with the given ID to the new name.
 *
 * @param auth the current authentication provider
 * @param itemID the ID of the item to rename
 * @param parentID the real ID of the folder that contains the item (not `.`), since names are tagged
 *      together with their parent's ID
 * @param newName the new name for the item
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function renameItem(
    auth: AuthProvider,
    itemID: string,
    parentID: string,
    newName: string,
): Promise<{ success: boolean; error?: string }> {
    let encryptedName: { name_enc: string; name_tag: string };
    try {
        encryptedName = await encryptNewName(auth, itemID, parentID, newName);
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }

    const encryptedID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(itemID, "utf-8"));
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/rename/${b64encodeURLSafe(encryptedID)}`,
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
            body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
                Buffer.from(JSON.stringify(encryptedName), "utf-8"),
            ),
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        case 409:
            return { success: false, error: "Item with that name already exists" };
        case 412:
            return { success: false, error: "Cannot rename root directory" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true };
}

/**
 * Renames multiple items at once.
 *
 * The operation is all-or-nothing on the server. If any rename is rejected, none of the items in
 * the request are renamed.
 *
 * @param auth the current authentication provider
 * @param renames mapping of the IDs of the items to rename to their new names, along with the real ID
 *      of the folder that contains each item
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function renameItems(
    auth: AuthProvider,
    renames: Record<string, { parentID: string; name: string }>,
): Promise<{ success: boolean; error?: string }> {
    if (Object.keys(renames).length === 0) {
        // No items to rename, so end early
        return { success: true };
    }

    const encryptedRenames: Record<string, { name_enc: string; name_tag: string }> = {};
    try {
        for (const [itemID, { parentID, name }] of Object.entries(renames)) {
            encryptedRenames[itemID] = await encryptNewName(auth, itemID, parentID, name);
        }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message };
    }

    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/rename-multiple`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify(encryptedRenames), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        case 409:
            return { success: false, error: "Item with that name already exists" };
        case 412:
            return { success: false, error: "Cannot rename root directory" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    // Trigger a sync and report success
    scheduleMerkleSync(auth);
    return { success: true };
}
