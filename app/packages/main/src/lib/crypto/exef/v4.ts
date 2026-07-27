import { gcm } from "@noble/ciphers/webcrypto.js";
import randomBytes from "randombytes";

import HKDF from "@lib/crypto/hkdf";
import { readUInt64BE, writeUInt64BE } from "@lib/util";

import {
    BaseDecryptor,
    BaseEncryptor,
    CipherID,
    KeyStrength,
    MAGIC,
    algForStrength,
    cipherIDToStrength,
    strengthToCipherID,
} from "./base";
import PADME from "./padme";

export const EXEF_VERSION = 4;

// Framing constants
export const HEADER_SIZE = 56;
export const SALT_SIZE = 32;
export const TAG_SIZE = 16;
export const LENGTH_PREFIX_SIZE = 8;
export const RESERVED_SIZE = 5;

// Chunk size exponent bounds (inclusive)
export const MIN_EXPONENT = 12; // 4 KiB
export const MAX_EXPONENT = 30; // 1 GiB
export const DEFAULT_EXPONENT = 16; // 64 KiB

// Chunk count bounds
export const MIN_CHUNK_COUNT = 1;
export const MAX_CHUNK_COUNT = 0xffffffff;

// Helper functions
/**
 * Returns the key size, in bytes, for the given cipher ID.
 *
 * @param cipherID cipher ID
 * @returns the key size, in bytes
 */
function keySizeForCipherID(cipherID: CipherID): number {
    return cipherIDToStrength(cipherID) / 8;
}

/**
 * Computes the number of chunks for a given padded size and chunk size.
 *
 * @param paddedSize the padded size, in bytes
 * @param chunkSize the chunk size, in bytes
 * @returns the number of chunks, i.e. `ceil(paddedSize / chunkSize)`
 */
export function computeChunkCount(paddedSize: number, chunkSize: number): number {
    // `BigInt`s are used so the ceiling is exact even for sizes beyond the range where floating
    // point division stays trustworthy
    const padded = BigInt(paddedSize);
    const chunk = BigInt(chunkSize);
    return Number((padded + chunk - 1n) / chunk);
}

/**
 * Computes the padded size for a plaintext of `length` bytes.
 *
 * @param length the plaintext length, in bytes
 * @returns the padded size, i.e. `8 + PADME(length)`
 */
export function computePaddedSize(length: number): number {
    return LENGTH_PREFIX_SIZE + PADME.computePaddedLength(length);
}

/**
 * Computes the total size of an ExEF v4 file for a plaintext of `length` bytes.
 *
 * @param length the plaintext length, in bytes
 * @param exponent the chunk size exponent, defaults to {@link DEFAULT_EXPONENT}
 * @returns the total encrypted size, i.e. `header + padded size + tags`
 */
export function computeEncryptedSize(length: number, exponent: number = DEFAULT_EXPONENT): number {
    const paddedSize = computePaddedSize(length);
    const n = computeChunkCount(paddedSize, 2 ** exponent);
    return HEADER_SIZE + paddedSize + TAG_SIZE * n;
}

/**
 * Builds the 12-byte AES-GCM nonce for the chunk at the given index.
 *
 * @param index the 0-based chunk index
 * @returns the nonce
 */
export function nonce(index: number): Buffer {
    const buffer = Buffer.alloc(12);
    buffer.writeUInt32BE(index, 8);
    return buffer;
}

/**
 * Builds the additional authenticated data for the chunk at the given index.
 *
 * @param header the complete 56-byte header
 * @param index the 0-based chunk index
 * @param isFinal whether this is the final chunk
 * @returns the additional authenticated data
 */
export function aad(header: Buffer, index: number, isFinal: boolean): Buffer {
    const suffix = Buffer.alloc(5);
    suffix.writeUInt32BE(index, 0);
    suffix.writeUInt8(isFinal ? 1 : 0, 4);
    return Buffer.concat([header, suffix]);
}

/**
 * Derives the ExEF v4 crypto key from a main key and salt using HKDF-SHA256.
 *
 * @param key the main key
 * @param salt the 32-byte HKDF salt
 * @param cipherID the cipher ID (appended to the HKDF `info` string)
 * @param keySize the desired key length, in bytes
 * @returns the derived crypto key
 */
export function deriveCryptoKey(key: Buffer, salt: Buffer, cipherID: CipherID, keySize: number): Buffer {
    const info = Buffer.concat([Buffer.from("ExEF v4 Crypto Key"), Buffer.from([cipherID])]);
    return new HKDF("sha256").hkdf(key, salt, info, keySize);
}

/**
 * Runs the ExEF v4 structural header checks in the order mandated by the specification.
 *
 * @param exponent the chunk size exponent
 * @param chunkCount the declared chunk count
 * @param paddedSize the declared padded size
 * @throws {Error} On the first check that fails
 */
function validateStructural(exponent: number, chunkCount: number, paddedSize: number): void {
    if (exponent < MIN_EXPONENT || exponent > MAX_EXPONENT) {
        throw new Error(`exponent must be between ${MIN_EXPONENT} and ${MAX_EXPONENT}`);
    }

    if (paddedSize < LENGTH_PREFIX_SIZE) {
        throw new Error("padded size out of range");
    }

    if (!PADME.isFixedPoint(paddedSize - LENGTH_PREFIX_SIZE)) {
        throw new Error("padded size is not a valid PADME output");
    }

    if (chunkCount < MIN_CHUNK_COUNT) {
        throw new Error("chunk count must be at least 1");
    }

    if (chunkCount !== computeChunkCount(paddedSize, 2 ** exponent)) {
        throw new Error("chunk count does not match padded size");
    }
}

// Main classes
/**
 * ExEF v4 header.
 */
export class Header {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = HEADER_SIZE;

    /** ID of the cipher suite used for encryption */
    cipherID: CipherID;
    /** Base-2 exponent of the plaintext chunk size */
    exponent: number;
    /** Number of chunks in the body */
    chunkCount: number;
    /** Total number of plaintext bytes across all chunks (length prefix + plaintext + padding) */
    paddedSize: number;
    /** 32-byte HKDF salt */
    salt: Buffer;
    /** 5 reserved bytes; must be zero */
    reserved: Buffer;

    constructor(cipherID: CipherID, exponent: number, chunkCount: number, paddedSize: number, salt: Buffer) {
        this.cipherID = cipherID;
        this.exponent = exponent;
        this.chunkCount = chunkCount;
        this.paddedSize = paddedSize;
        this.salt = salt;

        this.reserved = Buffer.alloc(RESERVED_SIZE);
    }

    /**
     * Generates the ExEF v4 header.
     */
    toBuffer(): Buffer {
        const buffer = Buffer.alloc(HEADER_SIZE);
        buffer.write(MAGIC, 0, 4);
        buffer.writeUInt8(EXEF_VERSION, 4);
        buffer.writeUInt8(this.cipherID, 5);
        buffer.writeUInt8(this.exponent, 6);
        buffer.writeUInt32BE(this.chunkCount, 7);
        writeUInt64BE(buffer, this.paddedSize, 11);
        this.salt.copy(buffer, 19);
        this.reserved.copy(buffer, 51);
        return buffer;
    }

    /**
     * Parses and validates an ExEF v4 header.
     *
     * Validation steps follow the order mandated by the specification so that structurally
     * impossible files are rejected before any key material is derived.
     *
     * @param buffer the 56 header bytes
     * @returns the parsed header
     * @throws {Error} If the header is malformed or fails any structural check
     */
    static fromBuffer(buffer: Buffer): Header {
        if (buffer.length !== HEADER_SIZE) {
            throw new Error(`header must be ${HEADER_SIZE} bytes (got ${buffer.length} bytes)`);
        }

        if (buffer.toString("ascii", 0, 4) !== MAGIC) {
            throw new Error("data must start with 'ExEF'");
        }

        const version = buffer.readUInt8(4);
        if (version !== EXEF_VERSION) {
            throw new Error(`version must be ${EXEF_VERSION}`);
        }

        const cipherID = buffer.readUInt8(5);
        if (cipherID !== 1 && cipherID !== 2 && cipherID !== 3) {
            throw new Error("unknown cipher ID");
        }

        const exponent = buffer.readUInt8(6);
        const chunkCount = buffer.readUInt32BE(7);
        const paddedSize = readUInt64BE(buffer, 11);
        const salt = buffer.subarray(19, 51);
        const reserved = buffer.subarray(51, 56);

        if (!reserved.equals(Buffer.alloc(RESERVED_SIZE))) {
            throw new Error("reserved bytes must be zero");
        }

        validateStructural(exponent, chunkCount, paddedSize);

        return new Header(cipherID, exponent, chunkCount, paddedSize, salt);
    }

    // Properties
    /** The plaintext chunk size, in bytes */
    get chunkSize(): number {
        return 1 << this.exponent;
    }

    /** The key size for the configured cipher, in bytes */
    get keySize(): number {
        return keySizeForCipherID(this.cipherID);
    }

    /** The key strength for the configured cipher, in bits */
    get strength(): KeyStrength {
        return cipherIDToStrength(this.cipherID);
    }

    /** The total size of the body (i.e., all chunks plus their tags), in bytes */
    get bodySize(): number {
        return this.paddedSize + TAG_SIZE * this.chunkCount;
    }

    // Public methods
    /**
     * Returns the plaintext size of the chunk at the given index.
     *
     * @param index the 0-based chunk index
     * @returns the number of plaintext bytes in that chunk
     */
    computeChunkPlaintextSize(index: number): number {
        if (index < this.chunkCount - 1) {
            return this.chunkSize;
        }
        return this.paddedSize - (this.chunkCount - 1) * this.chunkSize;
    }
}

/**
 * Class that handles the encryption of ExEF v4 messages.
 */
export class Encryptor extends BaseEncryptor {
    /** 32-byte HKDF salt used for encryption */
    readonly salt: Buffer;
    /** Base-2 exponent of the plaintext chunk size */
    readonly exponent: number;

    private readonly _keySize: number;
    private readonly _cipherID: CipherID;
    private readonly _cryptoKey: Buffer;

    // These parameters will be defined by `setParams()`
    private _paddedSize = -1;
    private _chunkCount = -1;
    private _headerBuffer: Buffer | null = null;

    // Streaming state
    private _preBuffer: Buffer = Buffer.alloc(0);
    private _ptReceived = 0;
    private _paddingAdded = false;
    private _chunksEmitted = 0;
    private _headerSent = false;

    /**
     * Creates a new ExEF v4 encryptor.
     *
     * @param key the main key as bytes
     * @param salt the 32-byte HKDF salt. If not provided, a fresh random salt is generated
     * @param strength the crypto key strength in bits, defaults to the length of `key` in bits
     * @param exponent the chunk size exponent, defaults to {@link DEFAULT_EXPONENT}
     * @throws {Error} if the salt is not 32 bytes
     * @throws {Error} if the exponent is out of range
     */
    constructor(key: Buffer, salt?: Buffer, strength?: KeyStrength, exponent: number = DEFAULT_EXPONENT) {
        super(key, strength);

        this._keySize = this._strength / 8;
        this._cipherID = strengthToCipherID(this._strength);

        this.salt = salt ?? randomBytes(SALT_SIZE);
        if (this.salt.length !== SALT_SIZE) {
            throw new Error(`salt must be ${SALT_SIZE} bytes`);
        }

        if (exponent < MIN_EXPONENT || exponent > MAX_EXPONENT) {
            throw new Error(`exponent must be between ${MIN_EXPONENT} and ${MAX_EXPONENT}`);
        }
        this.exponent = exponent;

        this._cryptoKey = deriveCryptoKey(key, this.salt, this._cipherID, this._keySize);
    }

    // Properties
    get fullyProcessed(): boolean {
        if (this._chunkCount === -1) {
            throw new Error("parameters must be set");
        }
        return this._chunksEmitted === this._chunkCount;
    }

    // Helper methods
    /**
     * Emits a chunk of encrypted data (i.e., ciphertext + tag).
     *
     * @param chunkPt the plaintext chunk to encrypt
     * @param isFinal whether this is the final chunk
     */
    private async _emitChunk(chunkPt: Buffer, isFinal: boolean): Promise<void> {
        const index = this._chunksEmitted;
        const cipher = gcm(this._cryptoKey, nonce(index), aad(this._headerBuffer!, index, isFinal));

        this._queue.push(Buffer.from(await cipher.encrypt(chunkPt)));
        this._chunksEmitted += 1;
    }

    /**
     * Emits all chunks that are fully available in the pre-encryption buffer.
     */
    private async _emitReadyChunks(): Promise<void> {
        const chunkSize = 1 << this.exponent;

        // Emit any complete non-final chunks
        while (this._chunksEmitted < this._chunkCount - 1 && this._preBuffer.length >= chunkSize) {
            const chunkPt = this._preBuffer.subarray(0, chunkSize);
            this._preBuffer = this._preBuffer.subarray(chunkSize);
            await this._emitChunk(chunkPt, false);
        }

        // Emit the final chunk once all padding is in place and only it remains
        if (this._paddingAdded && this._chunksEmitted === this._chunkCount - 1) {
            const chunkPt = this._preBuffer;
            this._preBuffer = Buffer.alloc(0);
            await this._emitChunk(chunkPt, true);
        }
    }

    // Public methods
    /**
     * Sets the parameters for the encryption process.
     *
     * @param length the length of the plaintext to be encrypted
     * @throws {Error} if the resulting encrypted data would exceed the format's size limits
     * @throws {Error} if there would be too many chunks
     */
    setParams(length: number): void {
        super.setParams(length);

        const paddedSize = computePaddedSize(length);
        if (paddedSize < length) {
            // `paddedSize < length` catches a fixed-width PADME overflow near 2**64
            throw new Error("plaintext too large");
        }

        const chunkSize = 1 << this.exponent;
        const n = computeChunkCount(paddedSize, chunkSize);
        if (n > MAX_CHUNK_COUNT) {
            throw new Error("too many chunks");
        }

        this._paddedSize = paddedSize;
        this._chunkCount = n;

        const header = new Header(this._cipherID, this.exponent, n, paddedSize, this.salt);
        this._headerBuffer = header.toBuffer();

        // The pre-encryption plaintext opens with the 8-byte plaintext length prefix
        this._preBuffer = Buffer.alloc(LENGTH_PREFIX_SIZE);
        writeUInt64BE(this._preBuffer, length, 0);
    }

    async update(data: Buffer): Promise<void> {
        if (this._headerBuffer === null) {
            throw new Error("parameters must be set");
        }

        if (this._ptReceived + data.length > this._length) {
            throw new Error("more plaintext supplied than declared length");
        }

        this._preBuffer = Buffer.concat([this._preBuffer, data]);
        this._ptReceived += data.length;

        // Once all plaintext has arrived, append the PADME padding
        if (this._ptReceived === this._length && !this._paddingAdded) {
            const padding = Buffer.alloc(this._paddedSize - LENGTH_PREFIX_SIZE - this._length);
            this._preBuffer = Buffer.concat([this._preBuffer, padding]);
            this._paddingAdded = true;
        }

        await this._emitReadyChunks();
    }

    get(): Buffer {
        if (!this._headerSent) {
            if (this._headerBuffer === null) {
                throw new Error("parameters must be set");
            }
            this._headerSent = true;
            return this._headerBuffer;
        }

        return this._drain();
    }

    async encrypt(pt: Buffer): Promise<Buffer> {
        this.setParams(pt.length);
        await this.update(pt);
        return Buffer.concat([this.get(), this.get()]); // Header, then all body chunks
    }
}

/**
 * Class that handles the decryption of ExEF v4 messages.
 */
export class Decryptor extends BaseDecryptor {
    private _header: Header | null = null;
    private _headerBytes: Buffer | null = null;
    private _cryptoKey: Buffer | null = null;

    // Ciphertext state
    /** Buffered ciphertext awaiting a complete chunk */
    private _ctBuffer: Buffer = Buffer.alloc(0);
    private _chunkIndex = 0;

    // Pre-encryption plaintext parsing state
    private _prefixBuffer: Buffer = Buffer.alloc(0);
    private _length: number | null = null;
    private _ptRemaining = 0;

    private _error: Error | null = null;
    private _failed = false;

    // Properties
    get fullyProcessed(): boolean {
        return this._header !== null && !this._failed && this._chunkIndex === this._header.chunkCount;
    }

    // Helper methods
    /**
     * Parses a decrypted chunk of the pre-encryption plaintext, emitting the plaintext it carries.
     *
     * @param chunkPt the decrypted chunk to process
     */
    private _processPreEncryption(chunkPt: Buffer): void {
        let data = chunkPt;

        // Read the 8-byte plaintext length prefix, which could span multiple chunks
        if (this._length === null) {
            const need = LENGTH_PREFIX_SIZE - this._prefixBuffer.length;
            this._prefixBuffer = Buffer.concat([this._prefixBuffer, data.subarray(0, need)]);
            data = data.subarray(need);
            if (this._prefixBuffer.length < LENGTH_PREFIX_SIZE) {
                return;
            }

            this._length = readUInt64BE(this._prefixBuffer, 0);
            const expectedPadmeLength = this._header!.paddedSize - LENGTH_PREFIX_SIZE;
            if (this._length > expectedPadmeLength || PADME.computePaddedLength(this._length) !== expectedPadmeLength) {
                this._error = new Error("declared plaintext size is inconsistent with padding");
                this._failed = true;
                return;
            }
            this._ptRemaining = this._length;
        }

        // Emit plaintext bytes
        if (this._ptRemaining > 0) {
            const n = Math.min(this._ptRemaining, data.length);
            if (n > 0) {
                this._queue.push(data.subarray(0, n));
                this._ptRemaining -= n;
            }
            data = data.subarray(n);
        }

        // Anything left is padding; enforce canonical (all-zero) padding
        for (const byte of data) {
            if (byte !== 0) {
                this._error = new Error("padding must be zero");
                this._failed = true;
                return;
            }
        }
    }

    // Public methods
    async update(data: Buffer): Promise<void> {
        if (this._failed) {
            return;
        }

        this._ctBuffer = Buffer.concat([this._ctBuffer, data]);

        // Parse the header first
        if (this._header === null) {
            if (this._ctBuffer.length < HEADER_SIZE) {
                return;
            }
            this._headerBytes = this._ctBuffer.subarray(0, HEADER_SIZE);
            this._ctBuffer = this._ctBuffer.subarray(HEADER_SIZE);
            try {
                this._header = Header.fromBuffer(this._headerBytes);
            } catch (error) {
                this._error = error as Error;
                this._failed = true;
                return;
            }
            this._cryptoKey = deriveCryptoKey(this.key, this._header.salt, this._header.cipherID, this._header.keySize);
        }

        // Decrypt whole chunks as they arrive
        while (this._chunkIndex < this._header.chunkCount) {
            const plaintextSize = this._header.computeChunkPlaintextSize(this._chunkIndex);
            const expected = plaintextSize + TAG_SIZE;
            if (this._ctBuffer.length < expected) {
                return;
            }

            // const ct = this._ctBuffer.subarray(0, plaintextSize);
            // const tag = this._ctBuffer.subarray(plaintextSize, expected);
            // this._ctBuffer = this._ctBuffer.subarray(expected);

            // const isFinal = this._chunkIndex === this._header.chunkCount - 1;
            // const cipher = new GCMDecipher(
            //     algForStrength(this._header.strength),
            //     this._cryptoKey!,
            //     nonce(this._chunkIndex),
            //     aad(this._headerBytes!, this._chunkIndex, isFinal),
            // );
            // cipher.setAuthTag(tag);

            // let chunkPt: Buffer;
            // try {
            //     chunkPt = Buffer.from(cipher.update(ct));
            //     cipher.verify();
            // } catch {
            //     this._error = new Error("chunk authentication failed");
            //     this._failed = true;
            //     return;
            // }

            const ct = this._ctBuffer.subarray(0, plaintextSize);
            const tag = this._ctBuffer.subarray(plaintextSize, expected);
            this._ctBuffer = this._ctBuffer.subarray(expected);

            const isFinal = this._chunkIndex === this._header.chunkCount - 1;
            const cipher = gcm(
                this._cryptoKey!,
                nonce(this._chunkIndex),
                aad(this._headerBytes!, this._chunkIndex, isFinal),
            );

            let chunkPt: Buffer;
            try {
                chunkPt = Buffer.from(await cipher.decrypt(Buffer.concat([ct, tag])));
            } catch (e) {
                this._error = new Error("chunk authentication failed");
                this._failed = true;
                return;
            }

            this._processPreEncryption(chunkPt);
            this._chunkIndex += 1;
        }
    }

    get(): Buffer {
        return this._drain();
    }

    verify(): void {
        if (this._error !== null) {
            throw this._error;
        }
        if (!this.fullyProcessed) {
            throw new Error("incomplete ExEF data");
        }
        if (this._ctBuffer.length > 0) {
            throw new Error("trailing data after final chunk");
        }
    }

    async decrypt(exefData: Buffer): Promise<Buffer> {
        await this.update(exefData);
        const output = this._drain();
        this.verify();
        return output;
    }
}

/**
 * Processor for version 4 of the Excalibur Encryption Format (ExEF).
 */
export default class ExEFv4 {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = HEADER_SIZE;
    /** Size of each per-chunk authentication tag, in bytes */
    static tagSize: number = TAG_SIZE;
    /** ExEF version number */
    static version: number = EXEF_VERSION;

    /** Encryption key */
    readonly key: Buffer;

    /** Encryptor object */
    readonly encryptor: Encryptor;
    /** Decryptor object */
    readonly decryptor: Decryptor;

    /**
     * Initializes an ExEF v4 object.
     *
     * @param key the key to use for encryption and decryption
     * @param salt the 32-byte salt to use for encryption. If not provided, a random salt is
     *      generated
     * @param strength the key strength to use for encryption, defaults to the length of `key` in
     *      bits
     * @param exponent the chunk size exponent, defaults to {@link DEFAULT_EXPONENT}
     * @throws {Error} if the key size is not 128, 192, or 256 bits
     */
    constructor(key: Buffer, salt?: Buffer, strength?: KeyStrength, exponent: number = DEFAULT_EXPONENT) {
        if (![128, 192, 256].includes(key.length * 8)) {
            throw new Error("keysize must be 128, 192, or 256");
        }

        if (!strength) {
            strength = (key.length * 8) as KeyStrength;
        }

        this.key = key;
        this.encryptor = new Encryptor(key, salt, strength, exponent);
        this.decryptor = new Decryptor(key);
    }

    // Properties
    /** Size of the AES key in bits */
    get keysize(): KeyStrength {
        return (this.key.length * 8) as KeyStrength;
    }

    /** The encryption algorithm used in the ExEF format based on the key size */
    get alg() {
        return algForStrength(this.keysize);
    }

    // Convenience methods
    async encrypt(data: Buffer): Promise<Buffer> {
        return await this.encryptor.encrypt(data);
    }

    async decrypt(data: Buffer): Promise<Buffer> {
        return await this.decryptor.decrypt(data);
    }

    // Other methods
    /**
     * Checks if the given data begins with a valid ExEF v4 header.
     *
     * @param data the data to check
     * @returns whether the data has a valid ExEF v4 header
     */
    static validate(data: Buffer): boolean {
        try {
            Header.fromBuffer(data.subarray(0, HEADER_SIZE));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Computes the total ExEF v4 size for a plaintext of the given length.
     *
     * @param plaintextLen the plaintext length, in bytes
     * @param exponent the chunk size exponent, defaults to {@link DEFAULT_EXPONENT}
     * @returns the total encrypted size, in bytes
     */
    static computeEncryptedSize(plaintextLen: number, exponent: number = DEFAULT_EXPONENT): number {
        return computeEncryptedSize(plaintextLen, exponent);
    }
}
