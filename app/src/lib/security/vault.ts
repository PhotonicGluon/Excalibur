import ExEF from "@lib/exef";
import { getVaultKey } from "@lib/security/api";
import { E2EEData } from "@lib/security/e2ee";

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the vault key for
 * @param e2eeData The E2EE data to use for interpreting requests/responses
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to the decrypted vault key, or null if an error occurs
 */
export async function retrieveVaultKey(
    apiURL: string,
    username: string,
    e2eeData: E2EEData,
    onError: (error: string) => void,
): Promise<Buffer<ArrayBufferLike> | null> {
    console.debug("Retrieving vault key");
    const vaultKeyResponse = await getVaultKey(apiURL, username, e2eeData.token, e2eeData.key);
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
