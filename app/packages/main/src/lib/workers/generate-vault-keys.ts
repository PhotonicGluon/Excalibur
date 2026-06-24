import { Buffer } from "buffer";
import { expose } from "comlink";
import randomBytes from "randombytes";

import ExEF from "@lib/crypto/exef";
import generateKey, { KeyGenFunction, KeygenAdditionalInfo } from "@lib/crypto/keygen";

globalThis.Buffer = Buffer;

const generationProcessor = {
    /**
     * Generates a data object containing the account unlock key (AUK) and the encrypted vault key.
     *
     * @param password the password to be used
     * @param additionalInfo additional information to be included in the key generation
     * @param existingVaultKey optional existing vault key to use instead of generating a new one
     * @param slowHash the slow hash function to use
     * @param onProgress optional callback to report progress
     * @returns an object containing the AUK and the encrypted vault key
     */
    async generateVaultKeys(
        password: string,
        additionalInfo: KeygenAdditionalInfo,
        existingVaultKey?: Buffer,
        slowHash: KeyGenFunction = "pbkdf2",
        onProgress?: (progress: number) => void,
    ): Promise<{
        auk: { key: Buffer; salt: Buffer };
        vault: { key: Buffer; encryptedKey: Buffer };
    }> {
        const aukSalt = randomBytes(32);
        const auk = await generateKey(password, additionalInfo, aukSalt, slowHash, onProgress);

        const vaultKey = existingVaultKey ?? randomBytes(32);
        const encryptedVaultKey = new ExEF(auk).encrypt(vaultKey);

        return { auk: { key: auk, salt: aukSalt }, vault: { key: vaultKey, encryptedKey: encryptedVaultKey } };
    },
};

export type VaultKeyGenerationProcessor = typeof generationProcessor;

// Expose the worker object to the main thread
expose(generationProcessor);
