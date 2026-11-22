import { b64decode } from "@lib/util";

import { decryptName } from "./crypto";
import { NameKeys } from "./keys";
import { SubstitutionCipher } from "./obfuscation";

/** The parts of an item, as sent by the server, that determine its name. */
export interface NameSource {
    /** ID of the item */
    id: string;
    /** Type of the item */
    type: "file" | "directory";
    /** Encrypted name (Base64), or `null` if the item still has a legacy plaintext name */
    name_enc: string | null;
    /** Legacy plaintext name, or `null` if the item has an encrypted name */
    name: string | null;
}

/**
 * Gets the name to display for an item.
 *
 * Items that have not been migrated yet only have a legacy name. For those, the `.exef` suffix is
 * removed from files, and the name is deciphered if names were obfuscated.
 *
 * @param keys the name keys to use
 * @param noc the cipher to decipher legacy names with, or `null` if names were not obfuscated
 * @param item the item to get the name of
 * @returns the item's name
 * @throws {Error} if the item has no name, or its encrypted name cannot be decrypted
 */
export async function resolveName(keys: NameKeys, noc: SubstitutionCipher | null, item: NameSource): Promise<string> {
    if (item.name_enc !== null) {
        return await decryptName(keys, item.id, b64decode(item.name_enc));
    }
    if (item.name === null) {
        throw new Error(`Item '${item.id}' has no name`);
    }

    let name = item.name;
    if (item.type === "file") {
        name = name.replace(/\.exef$/, "");
    }
    return noc ? noc.decipher(name).toString("utf-8") : name;
}

/**
 * Gets the name that is bound into an item's Merkle node hash.
 *
 * This is the decrypted name if the item has an encrypted name. Otherwise, it is the raw legacy name
 * exactly as stored, so that hashes made before the migration to encrypted names stay valid.
 *
 * @param keys the name keys to use
 * @param item the item to get the name of
 * @returns the name to hash
 * @throws {Error} if the item has no name, or its encrypted name cannot be decrypted
 */
export async function getMerkleName(
    keys: NameKeys,
    item: Pick<NameSource, "id" | "name_enc" | "name">,
): Promise<string> {
    if (item.name_enc !== null) {
        return await decryptName(keys, item.id, b64decode(item.name_enc));
    }
    if (item.name === null) {
        throw new Error(`Item '${item.id}' has no name`);
    }
    return item.name;
}
