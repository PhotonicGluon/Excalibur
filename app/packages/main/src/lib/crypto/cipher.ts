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
import { clean, copyBytes, isAligned32, u64Lengths } from "@noble/ciphers/utils.js";
import { createDecipheriv, DecipherCCM } from "node:crypto";

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

    /**
     * Creates a new BaseGCMCipher instance.
     *
     * @param alg algorithm used for encryption/decryption
     * @param key key used for encryption/decryption
     * @param nonce 12-byte nonce used for encryption
     */
    constructor(alg: GCMAlgorithm, key: Buffer, nonce: Buffer) {
        this.alg = alg;
        this.key = key;

        if (nonce.length !== 12) {
            throw new Error("nonce must be 12 bytes");
        }
        this.nonce = nonce;

        const { xk, authKey, counter, tagMask } = this.deriveKeys();
        this.xk = xk;
        this.authKey = authKey;
        this.counter = counter;
        this.tagMask = tagMask;
    }

    /** Updates the cipher with `data` */
    abstract update(data: Uint8Array): Uint8Array;

    /** Finalizes the cipher */
    abstract final(): Uint8Array;

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

        // Since our nonce is always 12 bytes, we can just set it directly
        counter.set(this.nonce);

        // GCTR_K(J0, 0^128) = E_K(J0); reusing ctr32() here extracts that tag
        // mask and leaves `counter` advanced to inc32(J0) for payload GCTR.
        const tagMask = nobleAES.ctr32(xk, false, counter, EMPTY_BLOCK);
        return { xk, authKey, counter, tagMask };
        // ---  END  ---
    }
}

export class GCMCipher extends BaseGCMCipher {
    /** Buffer for partial blocks */
    private _partialBlocks: Uint8Array = new Uint8Array(0);
    /** Total length of data processed so far */
    private _length: number = 0;
    /** GHASH instance for authentication */
    private readonly _hasher: GHASH;
    /** GHASH authentication tag */
    private _tag: Uint8Array | null = null;

    constructor(alg: GCMAlgorithm, key: Buffer, nonce: Buffer) {
        super(alg, key, nonce);
        this._hasher = ghash.create(this.authKey);
    }

    /**
     * Encrypts the given data using AES-CTR and updates the GHASH authentication tag
     *
     * @param data the data to encrypt
     * @returns the encrypted data
     */
    private _doCTR(data: Uint8Array) {
        const ciphertext = new Uint8Array(data.length);
        let pt: Uint8Array = data;
        const toClean: Uint8Array[] = [];

        // Make sure plaintext is aligned to 4-byte offset
        if (!isAligned32(pt)) {
            pt = copyBytes(pt);
            toClean.push(pt);
        }

        // Encrypt the aligned blocks and update tag
        nobleAES.ctr32(this.xk, false, this.counter, pt, ciphertext);
        this._hasher.update(ciphertext);
        this._length += data.length;

        // Clean up and return
        if (toClean.length > 0) {
            clean(...toClean);
        }

        return ciphertext;
    }

    update(plaintext: Uint8Array): Uint8Array {
        // Concatenate any leftover buffer with the new plaintext
        const data = new Uint8Array(this._partialBlocks.length + plaintext.length);
        data.set(this._partialBlocks, 0);
        data.set(plaintext, this._partialBlocks.length);

        // Determine the number of complete 16-byte blocks
        const blocksLen = Math.floor(data.length / 16) * 16;
        const blocks = data.subarray(0, blocksLen);

        // Keep the remainder for the next `update()` or `final()`
        this._partialBlocks = data.subarray(blocksLen);

        if (blocksLen === 0) {
            return new Uint8Array(0);
        }

        return this._doCTR(blocks);
    }

    final(): Uint8Array {
        // Encrypt any remaining bytes (the final partial block)
        let finalCiphertext = new Uint8Array(0);
        if (this._partialBlocks.length > 0) {
            finalCiphertext = this._doCTR(this._partialBlocks);
        }

        // Add the final block length
        const num = u64Lengths(8 * this._length, 0, false);
        this._hasher.update(num);

        // Mask the tag
        const tag = this._hasher.digest();
        for (let i = 0; i < this.tagMask.length; i++) {
            tag[i] ^= this.tagMask[i];
        }
        this._tag = tag;

        // Clean up stuff
        clean(this.xk, this.authKey, this.counter, this.tagMask);

        return finalCiphertext;
    }

    /**
     * @returns the authentication tag
     * @throws {Error} if the cipher has not been finalized
     */
    getAuthTag(): Buffer {
        if (this._tag === null) {
            throw new Error("Cipher has not been finalized");
        }
        return Buffer.from(this._tag);
    }
}

export class GCMDecipher extends BaseGCMCipher {
    /** Internal cipher used for decryption */
    private readonly _cipher: DecipherCCM;

    constructor(alg: GCMAlgorithm, key: Buffer, nonce: Buffer) {
        super(alg, key, nonce);
        this._cipher = createDecipheriv(this.alg, this.key, this.nonce);
    }

    update(data: Uint8Array): Uint8Array {
        return this._cipher.update(data);
    }

    final(): Uint8Array {
        return this._cipher.final();
    }

    /** Sets the authentication tag */
    setAuthTag(tag: Buffer): void {
        this._cipher.setAuthTag(tag);
    }
}
