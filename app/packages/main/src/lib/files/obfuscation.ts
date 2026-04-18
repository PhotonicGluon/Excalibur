import seedrandom from "seedrandom";

/**
 * Substitution cipher for obfuscation.
 */
export class SubstitutionCipher {
    private _prng: seedrandom.PRNG;
    private _forwardCipher: number[];
    private _backwardCipher: number[];

    /**
     * Creates a new substitution cipher with the given key.
     *
     * @param key key to use for the cipher
     */
    constructor(key: Buffer) {
        this._prng = seedrandom(key.toString("hex"));

        // Create the substitution maps
        this._forwardCipher = Array.from({ length: 256 }, (_, i) => i);
        this._backwardCipher = Array.from({ length: 256 });

        this._shuffle(this._forwardCipher);
        for (let i = 0; i < 256; i++) {
            this._backwardCipher[this._forwardCipher[i]] = i;
        }
    }

    // Helper methods
    /**
     * Randomly shuffles an array in place using the Fisher–Yates shuffle algorithm.
     *
     * @param array array to shuffle
     */
    private _shuffle(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this._prng() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Main methods
    /**
     * Enciphers a buffer using substitution cipher.
     *
     * @param pt plaintext to encipher
     * @returns ciphertext
     */
    encipher(pt: Buffer): string {
        const ct = Buffer.from(pt.map((b) => this._forwardCipher[b]));
        return ct.toString("hex");
    }

    /**
     * Deciphers a buffer using substitution cipher.
     *
     * @param ct ciphertext to decipher
     * @returns plaintext
     */
    decipher(ct: string): Buffer {
        const ctBuffer = Buffer.from(ct, "hex");
        return Buffer.from(ctBuffer.map((b) => this._backwardCipher[b]));
    }
}
