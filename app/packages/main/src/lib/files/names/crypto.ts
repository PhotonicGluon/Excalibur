import ExEF from "@lib/crypto/exef";
import { blake2b } from "@lib/crypto/hashing";
import { bytesToUUID, frame, unframe, uuidToBytes } from "@lib/util";
import { NameKeys } from "./keys";

/** Version byte of the plaintext record that is encrypted into a name */
const NAME_RECORD_VERSION = 0x01;

/**
 * Maximum size of an encrypted name (in bytes).
 *
 * This must match the server's `max_encrypted_name_size` setting.
 */
export const MAX_NAME_ENC_SIZE = 2048; // TODO: Get this alongside "max file size" in the authentication response

/**
 * Normalizes a name so that equivalent Unicode sequences produce the same bytes.
 *
 * @param name the name to normalize
 * @returns the NFC-normalized name, as UTF-8 bytes
 */
function nameToBytes(name: string): Buffer {
    return Buffer.from(name.normalize("NFC"), "utf-8");
}

/**
 * Encrypts an item's name.
 *
 * The item's ID is embedded in the record, which stops the server from swapping the encrypted
 * names of two items.
 *
 * @param keys the name keys to use
 * @param itemID the ID of the item that the name belongs to
 * @param name the name to encrypt
 * @returns the encrypted name
 * @throws {Error} if the encrypted name would be larger than {@link MAX_NAME_ENC_SIZE}
 */
export async function encryptName(keys: NameKeys, itemID: string, name: string): Promise<Buffer> {
    const plaintext = frame([Buffer.from([NAME_RECORD_VERSION]), uuidToBytes(itemID), nameToBytes(name)]);
    const nameEnc = await new ExEF(keys.enc, { version: 4 }).encrypt(plaintext);
    if (nameEnc.length > MAX_NAME_ENC_SIZE) {
        throw new Error("Name is too long");
    }
    return nameEnc;
}

/**
 * Decrypts an item's name.
 *
 * @param keys the name keys to use
 * @param itemID the ID of the item that the name belongs to
 * @param nameEnc the encrypted name
 * @returns the decrypted name
 * @throws {Error} if the record is malformed, or if it was encrypted for a different item
 */
export async function decryptName(keys: NameKeys, itemID: string, nameEnc: Buffer): Promise<string> {
    const plaintext = await new ExEF(keys.enc).decrypt(nameEnc);
    const parts = unframe(plaintext);
    if (parts.length !== 3 || parts[0].length !== 1 || parts[0][0] !== NAME_RECORD_VERSION) {
        throw new Error("Malformed name record");
    }
    if (bytesToUUID(parts[1]) !== itemID.toLowerCase()) {
        throw new Error("Encrypted name belongs to a different item");
    }
    return parts[2].toString("utf-8");
}

/**
 * Computes the tag of an item's name within its parent folder.
 *
 * The server uses the tag to make sure that names are unique within a folder, without learning the
 * names themselves.
 *
 * @param keys the name keys to use
 * @param parentID the real ID of the parent folder (not `.`)
 * @param name the item's name
 * @returns the 32-byte name tag
 */
export function computeNameTag(keys: NameKeys, parentID: string, name: string): Buffer {
    return blake2b(frame([uuidToBytes(parentID), nameToBytes(name)]), keys.tag);
}
