import { GCMAlgorithm } from "@lib/crypto/cipher";

/** The ASCII magic that every ExEF stream starts with */
export const MAGIC = "ExEF";

/** Identifier for the encryption algorithm used by an ExEF stream */
export type CipherID = 1 | 2 | 3;
/** Strength of the crypto key, in bits */
export type KeyStrength = 128 | 192 | 256;

/**
 * Converts a cipher ID to a key strength.
 *
 * @param cipherID cipher ID
 * @returns key strength
 */
export function cipherIDToStrength(cipherID: CipherID): KeyStrength {
    if (cipherID === 1) {
        return 128;
    } else if (cipherID === 2) {
        return 192;
    } else {
        return 256;
    }
}

/**
 * Converts a key strength to a cipher ID.
 *
 * @param strength key strength
 * @returns cipher ID
 * @throws {Error} If the strength is not 128, 192, or 256
 */
export function strengthToCipherID(strength: KeyStrength): CipherID {
    if (strength === 128) {
        return 1;
    } else if (strength === 192) {
        return 2;
    } else if (strength === 256) {
        return 3;
    }
    throw new Error("strength must be 128, 192, or 256");
}

/**
 * Returns the AES-GCM algorithm for the given key strength.
 *
 * @param strength key strength
 * @returns the algorithm identifier
 */
export function algForStrength(strength: KeyStrength): GCMAlgorithm {
    return `aes-${strength}-gcm` as GCMAlgorithm;
}

/**
 * Base class for encryption and decryption.
 */
export abstract class BaseCryptor {
    /** Key used for encryption/decryption */
    readonly key: Buffer;

    /** Queue used for buffering decrypted/encrypted output */
    protected _queue: Buffer[] = [];

    /**
     * Creates a new cryptor.
     *
     * @param key the main key as bytes
     */
    constructor(key: Buffer) {
        this.key = key;
    }

    // Properties
    /** Whether the encryption/decryption queue is empty */
    get isQueueClear(): boolean {
        return this._queue.length === 0;
    }

    /**
     * Whether the whole message has been processed.
     *
     * This includes getting the header and footer. To check if there is no more data in the queue,
     * access the {@link isQueueClear} property instead.
     */
    abstract get fullyProcessed(): boolean;

    // Helper methods
    /**
     * Drains and concatenates all currently-available output from the queue.
     *
     * @returns the concatenated output, or an empty buffer if nothing is queued
     */
    protected _drain(): Buffer {
        if (this._queue.length === 0) {
            return Buffer.alloc(0);
        }

        const out = Buffer.concat(this._queue);
        this._queue = [];
        return out;
    }

    // Public methods
    /**
     * Feeds data to the cryptor, emitting data as it becomes available.
     *
     * @param data the data to process
     */
    abstract update(data: Buffer): Promise<void>;

    /**
     * Gets the next piece of processed data.
     *
     * @returns the next piece of data, or an empty buffer if no more data is available
     */
    abstract get(): Buffer;
}

/**
 * Base class that handles the encryption of ExEF messages.
 */
export abstract class BaseEncryptor extends BaseCryptor {
    /** Strength of the crypto key, in bits */
    protected readonly _strength: KeyStrength;
    /** Length of the plaintext to be encrypted; set by {@link setParams} */
    protected _length: number = -1;

    /**
     * Creates a new encryptor.
     *
     * @param key the main key as bytes
     * @param strength the crypto key strength in bits, defaults to the length of `key` in bits
     */
    constructor(key: Buffer, strength?: KeyStrength) {
        super(key);

        const resolved = strength ?? ((key.length * 8) as KeyStrength);
        if (resolved !== 128 && resolved !== 192 && resolved !== 256) {
            throw new Error("strength must be 128, 192, or 256");
        }
        this._strength = resolved;
    }

    // Properties
    /** Strength of the crypto key, in bits */
    get strength(): KeyStrength {
        return this._strength;
    }

    /** The encryption algorithm used, based on the key strength */
    get alg(): GCMAlgorithm {
        return algForStrength(this._strength);
    }

    // Public methods
    /**
     * Sets the parameters for the encryption process.
     *
     * @param length the length of the plaintext to be encrypted
     */
    setParams(length: number): void {
        this._length = length;
    }

    /**
     * Encrypts the given plaintext in one shot.
     *
     * @param pt the plaintext to encrypt
     * @returns a promise that resolves to the complete ExEF data
     */
    abstract encrypt(pt: Buffer): Promise<Buffer>;
}

/**
 * Base class that handles the decryption of ExEF messages.
 */
export abstract class BaseDecryptor extends BaseCryptor {
    /**
     * Verifies the integrity of the decrypted data.
     *
     * @throws {Error} if the data is incomplete, malformed, or fails authentication
     */
    abstract verify(): void;

    /**
     * Decrypts the given ExEF data in one shot.
     *
     * @param exefData the ExEF data as bytes
     * @returns a promise that resolves to the decrypted plaintext as bytes
     */
    abstract decrypt(exefData: Buffer): Promise<Buffer>;
}
