import { Buffer } from "buffer";
import { expose } from "comlink";
import randomBytes from "randombytes";

import generateKey, { KeyGenFunction, KeygenAdditionalInfo } from "@lib/crypto/keygen";

globalThis.Buffer = Buffer;

const generationProcessor = {
    /**
     * Generates a data object containing the account unlock key (AUK) and its salt.
     *
     * @param password the password to be used
     * @param additionalInfo additional information to be included in the key generation
     * @param salt optional existing AUK salt to use instead of generating a new one
     * @param slowHash the slow hash function to use
     * @param onProgress optional callback to report progress
     * @returns an object containing the AUK and the AUK salt
     */
    async generateAUK(
        password: string,
        additionalInfo: KeygenAdditionalInfo,
        salt?: Buffer,
        slowHash: KeyGenFunction = "pbkdf2",
        onProgress?: (progress: number) => void,
    ): Promise<{
        key: Buffer;
        salt: Buffer;
    }> {
        const aukSalt = salt ?? randomBytes(32);
        const key = await generateKey(password, additionalInfo, aukSalt, slowHash, onProgress);
        return { key, salt: aukSalt };
    },
};

export type AUKGenerationProcessor = typeof generationProcessor;

// Expose the worker object to the main thread
expose(generationProcessor);
