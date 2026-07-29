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
    /** Length of the additional authenticated data */
    protected aadLength: number = 0;

    /** Expanded key for encryption */
    protected readonly xk: Uint32Array;
    /** Authentication key for GHASH */
    protected readonly authKey: Uint8Array;
    /** Counter for encryption */
    protected readonly counter: Uint8Array;
    /** Tag mask for authentication */
    protected readonly tagMask: Uint8Array;

    /** Total length of data processed so far */
    protected length: number = 0;
    /** GHASH instance for authentication */
    protected readonly hasher: GHASH;
    /** GHASH authentication tag */
    protected tag: Uint8Array | null = null;
    /** Whether the tag has already been computed, after which `update()` is rejected */
    protected finalized: boolean = false;

    /**
     * Unused tail of a keystream block.
     *
     * Consumed by the next `doCTR()` call.
     */
    protected keystream: Uint8Array = new Uint8Array(BLOCK_SIZE);
    /**
     * Read offset into {@link keystream}.
     *
     * A value of `BLOCK_SIZE` means "fully consumed".
     */
    protected keystreamPos: number = BLOCK_SIZE;

    /** Unprocessed ciphertext bytes into GHASH */
    protected hashBuffer: Uint8Array = new Uint8Array(0);

    /**
     * Creates a new BaseGCMCipher instance.
     *
     * @param alg algorithm used for encryption/decryption
     * @param key key used for encryption/decryption
     * @param nonce nonce used for encryption
     * @param aad any additional authenticated data
     */
    constructor(alg: GCMAlgorithm, key: Buffer, nonce: Buffer, aad?: Buffer) {
        this.alg = alg;
        this.key = key;
        this.nonce = nonce;

        this.aadLength = aad?.length || 0;

        const { xk, authKey, counter, tagMask } = this.deriveKeys();
        this.xk = xk;
        this.authKey = authKey;
        this.counter = counter;
        this.tagMask = tagMask;

        this.hasher = ghash.create(this.authKey);
        if (aad) {
            this.hasher.update(aad);
        }
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
     * This accepts input of _any_ length and may be called repeatedly with arbitrarily-sized
     * chunks. In effect, the CTR stream stays byte-aligned with the message rather than
     * block-aligned.
     *
     * @param data the data to process
     * @returns the processed data, which is always exactly `data.length` bytes
     */
    protected doCTR(data: Uint8Array): Uint8Array<ArrayBuffer> {
        const output = new Uint8Array(data.length);
        this.length += data.length;

        let i = 0;

        // Drain any keystream left over from previous call
        while (this.keystreamPos < BLOCK_SIZE && i < data.length) {
            output[i] = data[i] ^ this.keystream[this.keystreamPos];
            this.keystreamPos++;
            i++;
        }

        // Bulk-process every whole block that remains
        const blocksLen = Math.floor((data.length - i) / BLOCK_SIZE) * BLOCK_SIZE;
        if (blocksLen > 0) {
            const toClean: Uint8Array[] = [];

            let input: Uint8Array = data.subarray(i, i + blocksLen);
            if (!isAligned32(input)) {
                input = copyBytes(input);
                toClean.push(input);
            }

            const processed = nobleAES.ctr32(this.xk, false, this.counter, input);
            output.set(processed, i);
            toClean.push(processed);

            clean(...toClean);
            i += blocksLen;
        }

        // Handle any trailing partial block by only consuming part of a fresh keystream block
        // (Remainder of that block is retained for the next call)
        if (i < data.length) {
            this.keystream = nobleAES.ctr32(this.xk, false, this.counter, EMPTY_BLOCK);
            this.keystreamPos = 0;
            while (i < data.length) {
                output[i] = data[i] ^ this.keystream[this.keystreamPos];
                this.keystreamPos++;
                i++;
            }
        }

        return output;
    }

    /**
     * Feeds ciphertext to GHASH.
     *
     * Like with {@link doCTR}, this accepts input of _any_ length and may be called repeatedly
     * with arbitrarily-sized chunks. In effect, the GHASH computation stays byte-aligned with
     * the ciphertext rather than block-aligned.
     *
     * @param data ciphertext bytes to authenticate
     */
    protected hashUpdate(data: Uint8Array): void {
        const buf = new Uint8Array(this.hashBuffer.length + data.length);
        buf.set(this.hashBuffer, 0);
        buf.set(data, this.hashBuffer.length);

        const blocksLen = Math.floor(buf.length / BLOCK_SIZE) * BLOCK_SIZE;
        if (blocksLen > 0) {
            this.hasher.update(buf.subarray(0, blocksLen));
        }
        this.hashBuffer = buf.subarray(blocksLen);
    }

    /**
     * Computes the masked GCM tag.
     *
     * @returns the authentication tag
     */
    protected computeTag(): Uint8Array {
        if (this.hashBuffer.length > 0) {
            this.hasher.update(this.hashBuffer);
            this.hashBuffer = new Uint8Array(0);
        }

        const num = u64Lengths(8 * this.length, 8 * this.aadLength, false);
        this.hasher.update(num);

        const tag = this.hasher.digest();
        for (let i = 0; i < this.tagMask.length; i++) {
            tag[i] ^= this.tagMask[i];
        }

        clean(this.xk, this.authKey, this.counter, this.tagMask, this.keystream);
        this.keystreamPos = BLOCK_SIZE;
        this.finalized = true;

        return tag;
    }

    // Abstract methods
    /**
     * Updates the cipher with `data`.
     *
     * @param data the data to update the cipher with
     * @returns processed data of the same length as `data`
     */
    abstract update(data: Uint8Array): Uint8Array;
}

export class GCMCipher extends BaseGCMCipher {
    update(plaintext: Uint8Array): Uint8Array {
        if (this.finalized) {
            throw new Error("Cipher has already been finalized");
        }

        const ciphertext = this.doCTR(plaintext);
        this.hashUpdate(ciphertext);
        return ciphertext;
    }

    /**
     * Finalizes the cipher and computes the authentication tag.
     *
     * Produces no ciphertext: all ciphertext has already been returned by `update()`.
     *
     * @returns the authentication tag
     */
    digest(): Uint8Array {
        if (this.finalized) {
            throw new Error("Cipher has already been finalized");
        }

        this.tag = this.computeTag();
        return this.tag;
    }
}

export class GCMDecipher extends BaseGCMCipher {
    /**
     * Sets the GCM authentication tag.
     *
     * Must be done before calling `verify()`.
     *
     * @param tag the GCM authentication tag
     */
    setAuthTag(tag: Uint8Array): void {
        this.tag = tag;
    }

    update(ciphertext: Uint8Array): Uint8Array {
        if (this.finalized) {
            throw new Error("Decipher has already been finalized");
        }

        // GHASH is over the ciphertext, so authenticate before decrypting.
        this.hashUpdate(ciphertext);
        return this.doCTR(ciphertext);
    }

    /**
     * Verifies the authentication tag.
     *
     * @throws {Error} if the tag has not been set
     * @throws {Error} if the tag does not match
     */
    verify(): void {
        if (this.tag === null) {
            throw new Error("Authentication tag not set");
        }

        const tag = this.computeTag();
        if (!equalBytes(this.tag, tag)) {
            clean(tag, this.tag);
            throw new Error("Invalid authentication tag");
        }

        clean(tag);
    }
}
