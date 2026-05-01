import ExEF from "@lib/exef";
import { getVaultKey } from "@lib/users/api";

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the vault key for
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @param auk The account unlock key
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to the decrypted vault key, or null if an error occurs
 */
export async function retrieveVaultKey(
    apiURL: string,
    username: string,
    token: string,
    e2eeKey: Buffer,
    auk: Buffer,
    onError: (error: string) => void,
): Promise<Buffer<ArrayBufferLike> | null> {
    console.debug("Retrieving vault key");
    const vaultKeyResponse = await getVaultKey(apiURL, username, token, e2eeKey);
    if (!vaultKeyResponse.success) {
        onError(`Could not retrieve vault key: ${vaultKeyResponse.error}`);
        return null;
    }
    const encryptedVaultKey = vaultKeyResponse.encryptedKey!;

    console.debug("Decrypting obtained vault key...");
    try {
        const vaultKey = ExEF.decrypt(auk, encryptedVaultKey);
        console.debug(`Vault key: ${vaultKey.toString("hex")}`);
        return vaultKey;
    } catch (error: unknown) {
        onError(`Could not decrypt vault key: ${(error as Error).message}`);
        return null;
    }
}
