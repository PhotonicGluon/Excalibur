import { randomBytes } from "crypto";

import { decrypt, encrypt } from "@lib/crypto";
import { ExEF, algToKeysize } from "@lib/exef";
import { getVaultKey, setUpVaultKey } from "@lib/security/api/vault";

/**
 * Creates a new vault key and sets it up on the server.
 *
 * @param apiURL The URL of the API server to query
 * @param token The token to use for authentication
 * @param auk The account unlock key to use for encryption
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to a boolean indicating whether the vault key was successfully
 *      set up
 */
export async function createVaultKey(
    apiURL: string,
    token: string,
    auk: Buffer,
    onError: (error: string) => void,
): Promise<boolean> {
    console.debug("Creating new vault key");
    const vaultKey = randomBytes(32);
    const encryptedVaultKeyData = encrypt(vaultKey, auk);

    console.debug("Setting vault key on server...");
    const vaultKeyResponse = await setUpVaultKey(apiURL, token, {
        alg: encryptedVaultKeyData.alg,
        nonce: encryptedVaultKeyData.nonce,
        encryptedKey: encryptedVaultKeyData.ciphertext,
        tag: encryptedVaultKeyData.tag,
    });
    if (!vaultKeyResponse.success) {
        onError(`Could not set vault key: ${vaultKeyResponse.error}`);
        return false;
    }
    console.debug("Vault key set up");
    return true;
}

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param token The token to use for authentication
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @param auk The account unlock key to use for decryption
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to the decrypted vault key, or null if an error occurs
 */
export async function retrieveVaultKey(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
    auk: Buffer,
    onError: (error: string) => void,
): Promise<Buffer<ArrayBufferLike> | null> {
    console.debug("Retrieving vault key");
    const vaultKeyResponse = await getVaultKey(apiURL, token, e2eeKey);
    if (!vaultKeyResponse.success) {
        onError(`Could not retrieve vault key: ${vaultKeyResponse.error}`);
        return null;
    }
    const encryptedVaultKey = vaultKeyResponse.encryptedKey!;

    console.debug("Decrypting obtained vault key...");
    const exef = new ExEF(
        algToKeysize(encryptedVaultKey.alg),
        encryptedVaultKey.nonce,
        encryptedVaultKey.tag,
        encryptedVaultKey.encryptedKey,
    );
    const vaultKey = decrypt(exef, auk);

    console.debug(`Vault key: ${vaultKey.toString("hex")}`);
    return vaultKey;
}
