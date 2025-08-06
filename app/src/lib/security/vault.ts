import { randomBytes } from "crypto";

import ExEF from "@lib/exef";
import { getVaultKey, setUpVaultKey } from "@lib/security/api";
import { E2EEData } from "@lib/security/e2ee";

/**
 * Creates a new vault key and sets it up on the server.
 *
 * @param apiURL The URL of the API server to query
 * @param e2eeData The E2EE data to use for interpreting requests/responses
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to a boolean indicating whether the vault key was successfully
 *      set up
 */
export async function createVaultKey(
    apiURL: string,
    e2eeData: E2EEData,
    onError: (error: string) => void,
): Promise<boolean> {
    console.debug("Creating new vault key");
    const vaultKey = randomBytes(32);
    const exef = new ExEF(e2eeData.auk);
    const encryptedVaultKey = exef.encrypt(vaultKey);

    console.debug("Setting vault key on server...");
    const vaultKeyResponse = await setUpVaultKey(apiURL, e2eeData.token, e2eeData.key, encryptedVaultKey);
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
 * @param e2eeData The E2EE data to use for interpreting requests/responses
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to the decrypted vault key, or null if an error occurs
 */
export async function retrieveVaultKey(
    apiURL: string,
    e2eeData: E2EEData,
    onError: (error: string) => void,
): Promise<Buffer<ArrayBufferLike> | null> {
    console.debug("Retrieving vault key");
    const vaultKeyResponse = await getVaultKey(apiURL, e2eeData.token, e2eeData.key);
    if (!vaultKeyResponse.success) {
        onError(`Could not retrieve vault key: ${vaultKeyResponse.error}`);
        return null;
    }
    const encryptedVaultKey = vaultKeyResponse.encryptedKey!;

    console.debug("Decrypting obtained vault key...");
    try {
        const vaultKey = ExEF.decrypt(e2eeData.auk, encryptedVaultKey.encryptedKey);
        console.debug(`Vault key: ${vaultKey.toString("hex")}`);
        return vaultKey;
    } catch (error: unknown) {
        onError(`Could not decrypt vault key: ${(error as Error).message}`);
        return null;
    }
}
