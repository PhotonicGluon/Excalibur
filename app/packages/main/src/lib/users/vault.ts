import ExEF from "@lib/crypto/exef";
import { KeygenAdditionalInfo, generateAUK } from "@lib/crypto/keygen";
import { getVaultInfo } from "@lib/users/api";

import { VaultInfo } from "./structures";

/**
 * Retrieves the vault info from the server.
 *
 * @param apiURL the URL of the API server to query
 * @param token authentication token for accessing the server
 * @param password the password to use for deriving the AUK
 * @param additionalInfo additional information to use for deriving the AUK
 * @param e2eeKey the key used to decrypt the end-to-end encrypted communications
 * @param onError a function to call if an error occurs, which takes a string argument. The string
 *      will be the error message
 * @param onProgress a function to call to report progress, which takes a number argument. The number
 *      will be the progress percentage
 * @returns a promise which resolves to the vault information, or null if an error occurs
 */
export async function retrieveVaultInfo(
    apiURL: string,
    token: string,
    e2eeKey: Buffer,
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    onError: (error: string) => void,
    onProgress?: (progress: number) => void,
): Promise<VaultInfo | null> {
    // Get the vault info
    console.debug("Retrieving vault info");
    const vaultInfoResponse = await getVaultInfo(apiURL, token, e2eeKey);
    if (!vaultInfoResponse.success) {
        onError(`Could not retrieve vault info: ${vaultInfoResponse.error}`);
        return null;
    }

    const keygenAlgorithm = vaultInfoResponse.keygenAlgorithm!;
    const aukSalt = vaultInfoResponse.aukSalt!;
    const encryptedVaultKey = vaultInfoResponse.encryptedKey!;
    const vaultInfo = vaultInfoResponse.vaultInfo!;

    // Derive the AUK
    const { key: auk } = await generateAUK(password, additionalInfo, aukSalt, keygenAlgorithm, onProgress);

    // Recover vault key
    console.debug("Decrypting obtained vault key...");
    try {
        const vaultKey = await new ExEF(auk).decrypt(encryptedVaultKey);
        console.debug(`Vault key: ${vaultKey.toString("hex")}`);
        return {
            keygenAlgorithm,
            aukSalt,
            encryptedKey: encryptedVaultKey,
            key: vaultKey,
            info: vaultInfo,
        };
    } catch (error: unknown) {
        onError(`Could not decrypt vault key: ${(error as Error).message}`);
        return null;
    }
}
