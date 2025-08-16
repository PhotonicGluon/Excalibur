import ExEF from "@lib/exef";
import { getVaultKey } from "@lib/users/api";

import { AuthInfo } from "@contexts/auth";

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param authInfo The authentication info to use for retrieving the vault key
 * @param onError A function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @returns A promise which resolves to the decrypted vault key, or null if an error occurs
 */
export async function retrieveVaultKey(
    apiURL: string,
    authInfo: AuthInfo,
    onError: (error: string) => void,
): Promise<Buffer<ArrayBufferLike> | null> {
    console.debug("Retrieving vault key");
    const vaultKeyResponse = await getVaultKey(apiURL, authInfo.username!, authInfo.token, authInfo.key);
    if (!vaultKeyResponse.success) {
        onError(`Could not retrieve vault key: ${vaultKeyResponse.error}`);
        return null;
    }
    const encryptedVaultKey = vaultKeyResponse.encryptedKey!;

    console.debug("Decrypting obtained vault key...");
    try {
        const vaultKey = ExEF.decrypt(authInfo.auk, encryptedVaultKey);
        console.debug(`Vault key: ${vaultKey.toString("hex")}`);
        return vaultKey;
    } catch (error: unknown) {
        onError(`Could not decrypt vault key: ${(error as Error).message}`);
        return null;
    }
}
