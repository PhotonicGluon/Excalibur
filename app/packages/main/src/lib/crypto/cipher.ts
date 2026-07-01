/**
 * Part of this file is adapted from the `@noble/ciphers` library's `aes.ts` file, specifically
 * commit 09b2f4eecb9ceed7cf86d1cd97a68b7c711c8aa9, whose original file can be found at
 * https://github.com/paulmillr/noble-ciphers/blob/09b2f4e/src/aes.ts.
 *
 * `@noble/ciphers` is released under the MIT license:
 * > The MIT License (MIT)
 * >
 * > Copyright (c) 2022 Paul Miller (https://paulmillr.com)
 * > Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>
 *
 * > Permission is hereby granted, free of charge, to any person obtaining a copy
 * > of this software and associated documentation files (the “Software”), to deal
 * > in the Software without restriction, including without limitation the rights
 * > to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * > copies of the Software, and to permit persons to whom the Software is
 * > furnished to do so, subject to the following conditions:
 * >
 * > The above copyright notice and this permission notice shall be included in
 * > all copies or substantial portions of the Software.
 * >
 * > THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * > THE SOFTWARE.
 *
 * The specific parts that were adapted from `@noble/ciphers` will be marked so below.
 */
import { GHASH, ghash } from "@noble/ciphers/_polyval.js";
import { unsafe as nobleAES } from "@noble/ciphers/aes.js";
import { clean, copyBytes, createView, equalBytes, isAligned32, u64Lengths } from "@noble/ciphers/utils.js";

const BLOCK_SIZE = 16;
const EMPTY_BLOCK = new Uint8Array(BLOCK_SIZE);

export type GCMAlgorithm = "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm";

abstract class BaseGCMCipher {
    /** Algorithm used for encryption/decryption */
    protected alg: GCMAlgorithm;
    /** Key used for encryption/decryption */
    protected key: Buffer;
    /** Nonce used for encryption/decryption */
    protected nonce: Buffer;

    /** Expanded key for encryption */
    protected readonly xk: Uint32Array;
    /** Authentication key for GHASH */
    protected readonly authKey: Uint8Array;
    /** Counter for encryption */
    protected readonly counter: Uint8Array;
    /** Tag mask for authentication */
    protected readonly tagMask: Uint8Array;

    /** Buffer for partial blocks */
    protected partialBlocks: Uint8Array = new Uint8Array(0);
    /** Total length of data processed so far */
    protected length: number = 0;
    /** GHASH instance for authentication */
    protected readonly hasher: GHASH;
    /** GHASH authentication tag */
    protected tag: Uint8Array | null = null;

    /**
     * Creates a new BaseGCMCipher instance.
     *
     * @param alg algorithm used for encryption/decryption
     * @param key key used for encryption/decryption
     * @param nonce nonce used for encryption
     */
    constructor(alg: GCMAlgorithm, key: Buffer, nonce: Buffer) {
        this.alg = alg;
        this.key = key;
        this.nonce = nonce;

        const { xk, authKey, counter, tagMask } = this.deriveKeys();
        this.xk = xk;
        this.authKey = authKey;
        this.counter = counter;
        this.tagMask = tagMask;

        this.hasher = ghash.create(this.authKey);
    }

    // Helper methods
    /**
     * Derives the keys used in GCM.
     *
     * @returns an object containing the expanded key (`xk`), authentication key (`authKey`),
     *      counter (`counter`), and tag mask (`tagMask`)
     */
    protected deriveKeys(): { xk: Uint32Array; authKey: Uint8Array; counter: Uint8Array; tagMask: Uint8Array } {
        // Taken from lines 936-960, with minor modifications
        // --- BEGIN ---
        const xk = nobleAES.expandKeyLE(this.key);
        const authKey = EMPTY_BLOCK.slice();
        const counter = EMPTY_BLOCK.slice();

        nobleAES.ctr32(xk, false, counter, counter, authKey);

        // Different behavior for 96-bit and non-96-bit nonces
        if (this.nonce.length === 12) {
            counter.set(this.nonce);
        } else {
            const nonceLen = EMPTY_BLOCK.slice();
            const view = createView(nonceLen);
            view.setBigUint64(8, BigInt(this.nonce.length * 8), false);
            // GHASH.update() pads each call to 16 bytes, so
            // update(nonce).update(nonceLen) realizes
            // IV || 0^s || 0^64 || [len(IV)]_64 for non-96-bit nonces.
            // ghash(nonce || u64be(0) || u64be(nonceLen*8))
            const g = ghash.create(authKey).update(this.nonce).update(nonceLen);
            g.digestInto(counter); // digestInto doesn't trigger '.destroy'
            g.destroy();
        }

        // GCTR_K(J0, 0^128) = E_K(J0); reusing ctr32() here extracts that tag
        // mask and leaves `counter` advanced to inc32(J0) for payload GCTR.
        const tagMask = nobleAES.ctr32(xk, false, counter, EMPTY_BLOCK);
        return { xk, authKey, counter, tagMask };
        // ---  END  ---
    }

    /**
     * Processes the given data using AES-CTR.
     *
     * @param data the data to process
     * @returns the processed data
     */
    protected doCTR(data: Uint8Array): Uint8Array<ArrayBuffer> {
        const output = new Uint8Array(data.length);
        const toClean: Uint8Array[] = [];

        let input: Uint8Array = data;
        if (!isAligned32(input)) {
            input = copyBytes(input);
            toClean.push(input);
        }
        this.length += input.length;

        nobleAES.ctr32(this.xk, false, this.counter, input, output);
        if (toClean.length > 0) {
            clean(...toClean);
        }

        return output;
    }

    // Abstract methods
    /**
     * Updates the cipher with `data`.
     *
     * @param data the data to update the cipher with
     * @returns processed data
     */
    abstract update(data: Uint8Array): Uint8Array;

    /**
     * Finalizes the cipher.
     *
     * @returns the final processed data
     */
    abstract final(): Uint8Array;
}

export class GCMCipher extends BaseGCMCipher {
    update(plaintext: Uint8Array): Uint8Array {
        // Concatenate any leftover buffer with the new plaintext
        const data = new Uint8Array(this.partialBlocks.length + plaintext.length);
        data.set(this.partialBlocks, 0);
        data.set(plaintext, this.partialBlocks.length);

        // Determine the number of complete 16-byte blocks
        const blocksLen = Math.floor(data.length / 16) * 16;
        const blocks = data.subarray(0, blocksLen);

        // Keep the remainder for the next `update()` or `final()`
        this.partialBlocks = data.subarray(blocksLen);

        if (blocksLen === 0) {
            return new Uint8Array(0);
        }

        // Perform CTR
        const ciphertext = this.doCTR(blocks);
        this.hasher.update(ciphertext);
        return ciphertext;
    }

    final(): Uint8Array {
        // Encrypt any remaining bytes (the final partial block)
        let finalCiphertext = new Uint8Array(0);
        if (this.partialBlocks.length > 0) {
            finalCiphertext = this.doCTR(this.partialBlocks);
            this.hasher.update(finalCiphertext);
        }

        // Add the final block length
        const num = u64Lengths(8 * this.length, 0, false);
        this.hasher.update(num);

        // Mask the tag
        const tag = this.hasher.digest();
        for (let i = 0; i < this.tagMask.length; i++) {
            tag[i] ^= this.tagMask[i];
        }
        this.tag = tag;

        // Clean up stuff
        clean(this.xk, this.authKey, this.counter, this.tagMask);

        return finalCiphertext;
    }

    /**
     * @returns the authentication tag
     * @throws {Error} if the cipher has not been finalized
     */
    getAuthTag(): Uint8Array {
        if (this.tag === null) {
            throw new Error("Cipher has not been finalized");
        }
        return this.tag;
    }
}

export class GCMDecipher extends BaseGCMCipher {
    /**
     * Sets the GCM authentication tag.
     *
     * Must be done before calling `final()`.
     *
     * @param tag the GCM authentication tag
     */
    setAuthTag(tag: Uint8Array): void {
        this.tag = tag;
    }

    update(ciphertext: Uint8Array): Uint8Array {
        // Concatenate any leftover buffer with the new plaintext
        const data = new Uint8Array(this.partialBlocks.length + ciphertext.length);
        data.set(this.partialBlocks, 0);
        data.set(ciphertext, this.partialBlocks.length);

        // Determine the number of complete 16-byte blocks
        const blocksLen = Math.floor(data.length / 16) * 16;
        const blocks = data.subarray(0, blocksLen);

        // Keep the remainder for the next `update()` or `final()`
        this.partialBlocks = data.subarray(blocksLen);

        if (blocksLen === 0) {
            return new Uint8Array(0);
        }

        // Perform CTR
        const plaintext = this.doCTR(blocks);
        this.hasher.update(blocks);
        return plaintext;
    }

    final(): Uint8Array {
        if (this.tag === null) {
            throw new Error("Authentication tag not set");
        }

        // Decrypt any remaining bytes (the final partial block)
        let finalPlaintext = new Uint8Array(0);
        if (this.partialBlocks.length > 0) {
            finalPlaintext = this.doCTR(this.partialBlocks);
            this.hasher.update(this.partialBlocks);
        }

        // Add the final block length
        const num = u64Lengths(8 * this.length, 0, false);
        this.hasher.update(num);

        // Mask the tag
        const tag = this.hasher.digest();
        for (let i = 0; i < this.tagMask.length; i++) {
            tag[i] ^= this.tagMask[i];
        }

        // Clean up stuff
        clean(this.xk, this.authKey, this.counter, this.tagMask);

        // Verify the tag
        if (!equalBytes(this.tag, tag)) {
            clean(tag, this.tag);
            throw new Error("Invalid authentication tag");
        }

        return finalPlaintext;
    }
}
