import { chunkStream } from "@lib/util";

import { BaseDecryptor, BaseEncryptor, KeyStrength, MAGIC } from "./base";
import ExEFv3, { Decryptor as DecryptorV3 } from "./v3";
import ExEFv4, { DEFAULT_EXPONENT, Decryptor as DecryptorV4 } from "./v4";

/** The ExEF version produced when encrypting, unless overridden */
export const DEFAULT_VERSION = 4;

export const SUPPORTED_VERSIONS = [3, 4] as const;
export type ExEFVersion = (typeof SUPPORTED_VERSIONS)[number];

// The version byte lives at offset 4, so we need at least 5 bytes to identify a stream
const VERSION_OFFSET = 4;
const MIN_IDENTIFY_BYTES = VERSION_OFFSET + 1;

// Helper functions
/**
 * Creates the version-specific decryptor for the given version.
 *
 * @param version the ExEF version
 * @param key the decryption key
 * @returns the decryptor
 */
function decryptorFor(version: ExEFVersion, key: Buffer): BaseDecryptor {
    return version === 3 ? new DecryptorV3(key) : new DecryptorV4(key);
}

// Main functions
/**
 * Identifies the ExEF version of a data stream from its header.
 *
 * Only the magic bytes and version byte are inspected, so this works on a truncated stream as long
 * as a minimal amount of data is present for identification.
 *
 * @param data the (start of the) ExEF data
 * @returns the ExEF version number
 * @throws {Error} if the stream is too short
 * @throws {Error} if the magic is wrong
 * @throws {Error} if the version is unsupported
 */
export function identifyVersion(data: Buffer): ExEFVersion {
    if (data.length < MIN_IDENTIFY_BYTES) {
        throw new Error("data too short to identify ExEF version");
    }
    if (data.toString("ascii", 0, 4) !== MAGIC) {
        throw new Error("data must start with 'ExEF'");
    }

    const version = data.readUInt8(VERSION_OFFSET);
    if (version !== 3 && version !== 4) {
        throw new Error(`unsupported ExEF version: ${version}`);
    }
    return version;
}

// Helper classes
/**
 * A streaming decryptor that identifies the ExEF version from the incoming stream and delegates to
 * the appropriate version-specific decryptor.
 */
class AutoDecryptor extends BaseDecryptor {
    private _buffer: Buffer = Buffer.alloc(0);
    private _delegate: BaseDecryptor | null = null;
    private _error: Error | null = null;

    // Properties
    get isQueueClear(): boolean {
        return this._delegate === null || this._delegate.isQueueClear;
    }

    get fullyProcessed(): boolean {
        return this._delegate !== null && this._delegate.fullyProcessed;
    }

    // Helper methods
    /**
     * Ensures that the delegate decryptor is initialized, once enough bytes have arrived.
     */
    private _ensureDelegate(): void {
        if (this._delegate !== null || this._error !== null) {
            return;
        }
        if (this._buffer.length < MIN_IDENTIFY_BYTES) {
            return;
        }

        let version: ExEFVersion;
        try {
            version = identifyVersion(this._buffer);
        } catch (error) {
            this._error = error as Error;
            return;
        }

        this._delegate = decryptorFor(version, this.key);
        const buffered = this._buffer;
        this._buffer = Buffer.alloc(0);
        this._delegate.update(buffered);
    }

    // Public methods
    update(data: Buffer): void {
        if (this._delegate !== null) {
            this._delegate.update(data);
            return;
        }

        this._buffer = Buffer.concat([this._buffer, data]);
        this._ensureDelegate();
    }

    get(): Buffer {
        if (this._delegate === null) {
            return Buffer.alloc(0);
        }
        return this._delegate.get();
    }

    verify(): void {
        if (this._error !== null) {
            throw this._error;
        }
        if (this._delegate === null) {
            throw new Error("incomplete ExEF data");
        }

        this._delegate.verify();
    }

    decrypt(exefData: Buffer): Buffer {
        this.update(exefData);
        const output = this.get();
        this.verify();
        return output;
    }
}

/** Options accepted when constructing an {@link ExEF} instance */
export interface ExEFOptions {
    /** The ExEF version to produce when encrypting, defaults to {@link DEFAULT_VERSION} */
    version?: ExEFVersion;
    /** The key strength to use for encryption, defaults to the length of the key in bits */
    strength?: KeyStrength;
    /** (ExEF v3 only) The 12-byte nonce to use for encryption */
    nonce?: Buffer;
    /** (ExEF v4 only) The 32-byte salt to use for encryption */
    salt?: Buffer;
    /** (ExEF v4 only) The chunk size exponent, defaults to {@link DEFAULT_EXPONENT} */
    exponent?: number;
}

/**
 * Excalibur Encryption Format (ExEF) processor.
 *
 * Encryption produces the version given by the `version` option (defaulting to
 * {@link DEFAULT_VERSION}), while decryption auto-detects the version of whatever data it is fed.
 */
export default class ExEF {
    // Legacy fields
    /** Size of the ExEF v3 header, in bytes */
    static v3HeaderSize: number = ExEFv3.headerSize;
    /** Size of the ExEF v3 footer, in bytes */
    static v3FooterSize: number = ExEFv3.footerSize;
    /** Size of the ExEF v3 additional (non-plaintext) data, in bytes */
    static v3AdditionalSize: number = ExEFv3.additionalSize;

    /** Encryption key */
    readonly key: Buffer;
    /** The ExEF version produced when encrypting */
    readonly version: ExEFVersion;

    private readonly _options: ExEFOptions;
    private readonly _processor: ExEFv3 | ExEFv4;
    private readonly _decryptor: AutoDecryptor;

    /**
     * Creates a new ExEF instance.
     *
     * @param key encryption key
     * @param options encryption options; see {@link ExEFOptions}
     * @throws {Error} If the version is not supported
     * @throws {Error} If the key size is not 128, 192, or 256 bits
     */
    constructor(key: Buffer, options: ExEFOptions = {}) {
        const version = options.version ?? (DEFAULT_VERSION as ExEFVersion);
        if (!SUPPORTED_VERSIONS.includes(version)) {
            throw new Error(`unsupported ExEF version: ${version}`);
        }

        this.key = key;
        this.version = version;
        this._options = options;

        // Build the version-specific processor used for encryption
        this._processor = ExEF._buildProcessor(key, version, options);

        // The decryptor auto-detects the version of whatever stream it is fed
        this._decryptor = new AutoDecryptor(key);
    }

    // Properties
    /** Size of the AES key in bits */
    get keysize(): KeyStrength {
        return (this.key.length * 8) as KeyStrength;
    }

    /** The encryption algorithm used, based on the key size */
    get alg() {
        return this._processor.alg;
    }

    /** The chunk size exponent used when producing ExEF v4 */
    get exponent(): number {
        return this._options.exponent ?? DEFAULT_EXPONENT;
    }

    /** The version-specific encryptor object used for encryption */
    get encryptor(): BaseEncryptor {
        return this._processor.encryptor;
    }

    /** The version-detecting decryptor object used for decryption */
    get decryptor(): AutoDecryptor {
        return this._decryptor;
    }

    // Helper methods
    /**
     * Builds the version-specific processor used for encryption.
     *
     * @param key encryption key
     * @param version the ExEF version to produce
     * @param options encryption options
     * @returns the processor
     */
    private static _buildProcessor(key: Buffer, version: ExEFVersion, options: ExEFOptions): ExEFv3 | ExEFv4 {
        if (version === 3) {
            return new ExEFv3(key, options.nonce, options.strength);
        }
        return new ExEFv4(key, options.salt, options.strength, options.exponent ?? DEFAULT_EXPONENT);
    }

    // Public methods
    /**
     * Encrypts the given data as the configured version.
     *
     * @param data the data to be encrypted, as bytes
     * @returns the ExEF bytes
     */
    encrypt(data: Buffer): Buffer {
        return this._processor.encrypt(data);
    }

    /**
     * Encrypts the given stream of plaintext data.
     *
     * @param ptLen plaintext length
     * @param ptStream stream of plaintext
     * @param chunkSize size of each chunk read from {@link ptStream}
     * @param version ExEF version to produce, defaults to this instance's version
     * @returns a stream of ExEF bytes
     */
    encryptStream(
        ptLen: number,
        ptStream: ReadableStream<Buffer>,
        chunkSize: number,
        version: ExEFVersion = this.version,
    ): ReadableStream<Buffer> {
        const processor =
            version === this.version ? this._processor : ExEF._buildProcessor(this.key, version, this._options);
        const encryptor = processor.encryptor;
        encryptor.setParams(ptLen);

        const chunkingStream = chunkStream(ptStream, chunkSize);
        return new ReadableStream<Buffer>({
            async start(controller) {
                // Yield header
                controller.enqueue(encryptor.get());

                // Yield the body as it becomes available
                const reader = chunkingStream.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    encryptor.update(Buffer.from(value));
                    const encBlock = encryptor.get();
                    if (encBlock.length > 0) {
                        controller.enqueue(encBlock);
                    }
                }

                // Flush whatever the encryptor still holds
                // (i.e., the trailing chunk, and for v3 the footer)
                while (true) {
                    const remaining = encryptor.get();
                    if (remaining.length === 0) {
                        break;
                    }
                    controller.enqueue(remaining);
                }

                // Close stream
                controller.close();
            },
        });
    }

    /**
     * Decrypts the given ExEF data, auto-detecting its version.
     *
     * @param key key to use for decryption
     * @param exefData data to decrypt
     * @returns plaintext
     * @throws {Error} if the data is malformed or of an unsupported version
     * @throws {Error} if the header MAC does not match the computed header MAC (ExEF v3)
     * @throws {Error} if the response data cannot be decrypted (e.g., tag mismatch)
     */
    static decrypt(key: Buffer, exefData: Buffer): Buffer {
        return new AutoDecryptor(key).decrypt(exefData);
    }

    /**
     * Decrypts the given stream of ExEF bytes, auto-detecting its version.
     *
     * @param key key to use for decryption
     * @param exefStream stream of ExEF bytes
     * @param chunkSize size of each chunk read from {@link exefStream}
     * @returns a stream of plaintext bytes
     * @throws {Error} if the data is malformed or of an unsupported version
     * @throws {Error} if the header MAC does not match the computed header MAC (ExEF v3)
     * @throws {Error} if the stream ends before all the data has been received
     * @throws {Error} if the data cannot be decrypted (e.g., tag mismatch)
     */
    static decryptStream(
        key: Buffer,
        exefStream: ReadableStream<Uint8Array>,
        chunkSize: number,
    ): ReadableStream<Uint8Array> {
        const chunkingStream = chunkStream(exefStream, chunkSize);
        return new ReadableStream<Uint8Array>({
            async start(controller) {
                const decryptor = new AutoDecryptor(key);
                const reader = chunkingStream.getReader();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    decryptor.update(Buffer.from(value));
                    const decBlock = decryptor.get();
                    if (decBlock.length > 0) {
                        controller.enqueue(decBlock);
                    }
                }

                // Throws if the stream was truncated or failed authentication
                decryptor.verify();

                // v3 only emits its trailing plaintext once verified
                const remaining = decryptor.get();
                if (remaining.length > 0) {
                    controller.enqueue(remaining);
                }

                // Close stream
                controller.close();
            },
        });
    }

    /**
     * Decrypts the given ExEF data and parses it as JSON.
     *
     * @param key key to use for decryption
     * @param exefData data to decrypt
     * @param parse whether to parse the decrypted data as JSON
     * @returns the decrypted JSON data, or null if the decrypted data is empty
     * @throws {Error} if the keysize does not match
     * @throws {Error} if the response data cannot be decrypted (e.g., tag mismatch)
     */
    static decryptJSON<T>(key: Buffer, exefData: Buffer, parse: boolean = true): T | null {
        const decrypted = ExEF.decrypt(key, exefData);
        if (parse) {
            const decryptedStr = decrypted.toString("utf-8");
            if (decryptedStr.length === 0) {
                return null as T;
            }
            return JSON.parse(decryptedStr) as T;
        }
        return decrypted as T;
    }

    /**
     * Decrypts the response data using the provided key if the response is encrypted.
     *
     * @param key key to use for decryption
     * @param response the HTTP response containing potentially encrypted data
     * @param parse whether to parse the decrypted data as JSON
     * @returns a promise that resolves to the decrypted data, or the original data if not encrypted
     * @throws {Error} if the keysize does not match
     * @throws {Error} if the response data cannot be decrypted (e.g., tag mismatch)
     */
    static async decryptResponse<T>(key: Buffer, response: Response, parse: boolean = true): Promise<T | null> {
        let data: T | null;
        if (response.headers.get("X-Encrypted") === "true") {
            const arrayBuffer = await response.arrayBuffer();
            const responseData = Buffer.from(arrayBuffer);
            data = ExEF.decryptJSON<T>(key, responseData, parse);
        } else {
            data = (await response.json()) as T;
        }

        return data;
    }

    // Other methods
    /**
     * Checks if the given data is valid ExEF data of any supported version.
     *
     * @param data the data to check
     * @returns whether the data is valid ExEF data
     */
    static validate(data: Buffer): boolean {
        let version: ExEFVersion;
        try {
            version = identifyVersion(data);
        } catch {
            return false;
        }
        return version === 3 ? ExEFv3.validate(data) : ExEFv4.validate(data);
    }

    /**
     * Computes the total encrypted size for a plaintext of the given length.
     *
     * @param plaintextLen the plaintext length, in bytes
     * @param version the ExEF version, defaults to {@link DEFAULT_VERSION}
     * @param exponent (ExEF v4 only) the chunk size exponent
     * @returns the total encrypted size, in bytes
     */
    static encryptedSize(
        plaintextLen: number,
        version: ExEFVersion = DEFAULT_VERSION as ExEFVersion,
        exponent: number = DEFAULT_EXPONENT,
    ): number {
        if (version === 3) {
            return ExEFv3.computeEncryptedSize(plaintextLen);
        }
        return ExEFv4.computeEncryptedSize(plaintextLen, exponent);
    }

    /**
     * Computes the encrypted overhead (encrypted size minus plaintext size).
     *
     * @param plaintextLen the plaintext length, in bytes
     * @param version the ExEF version, defaults to {@link DEFAULT_VERSION}
     * @param exponent (ExEF v4 only) the chunk size exponent
     * @returns the overhead, in bytes
     */
    static overhead(
        plaintextLen: number,
        version: ExEFVersion = DEFAULT_VERSION as ExEFVersion,
        exponent: number = DEFAULT_EXPONENT,
    ): number {
        return ExEF.encryptedSize(plaintextLen, version, exponent) - plaintextLen;
    }

    /**
     * Computes the total encrypted size for a plaintext of the given length, using this instance's
     * version and chunk size exponent.
     *
     * @param plaintextLen the plaintext length, in bytes
     * @returns the total encrypted size, in bytes
     */
    encryptedSize(plaintextLen: number): number {
        return ExEF.encryptedSize(plaintextLen, this.version, this.exponent);
    }
}
