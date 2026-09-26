import createHmac from "create-hmac";
import randomBytes from "randombytes";

import { GCMCipher, GCMDecipher } from "@lib/crypto/cipher";
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

export const EXEF_VERSION = 3;

// Framing constants
export const HEADER_SIZE = 40;
export const FOOTER_SIZE = 16;
export const ADDITIONAL_SIZE = HEADER_SIZE + FOOTER_SIZE;
export const NONCE_SIZE = 12;
export const HEADER_MAC_SIZE = 14;

// Helper functions
/**
 * Derives an ExEF v3 subkey from the main key and nonce using HKDF-SHA256.
 *
 * @param key the main key
 * @param nonce the 12-byte nonce, used as the HKDF salt
 * @param context the HKDF `info` string
 * @param length the desired key length, in bytes
 * @returns the derived key
 */
function genKey(key: Buffer, nonce: Buffer, context: Buffer, length: number): Buffer {
    return new HKDF("sha256").hkdf(key, nonce, context, length);
}

/**
 * Derives the ExEF v3 crypto key.
 *
 * @param key the main key
 * @param nonce the 12-byte nonce, used as the HKDF salt
 * @param length the desired key length, in bytes
 * @returns the derived crypto key
 */
function genCryptoKey(key: Buffer, nonce: Buffer, length: number): Buffer {
    return genKey(key, nonce, Buffer.from("ExEF Crypto Key"), length);
}

/**
 * Derives the ExEF v3 MAC key.
 *
 * @param key the main key
 * @param nonce the 12-byte nonce, used as the HKDF salt
 * @param length the desired key length, in bytes
 * @returns the derived MAC key
 */
function genMacKey(key: Buffer, nonce: Buffer, length: number): Buffer {
    return genKey(key, nonce, Buffer.from("ExEF MAC Key"), length);
}

/**
 * Computes the header MAC for an ExEF v3 header.
 *
 * @param macKey the MAC key
 * @param strength the crypto/MAC key strength
 * @param nonce the 12-byte nonce
 * @param ctLen the ciphertext length, in bytes
 * @returns the 14-byte header MAC
 */
function computeHeaderMAC(macKey: Buffer, strength: KeyStrength, nonce: Buffer, ctLen: number): Buffer {
    // The header MAC is computed over the header with the MAC field zeroed out
    const header = new Header(strength, nonce, Buffer.alloc(HEADER_MAC_SIZE), ctLen);
    return createHmac("sha256", macKey).update(header.toBuffer()).digest().subarray(0, HEADER_MAC_SIZE);
}

// Main classes
/**
 * ExEF v3 header.
 */
export class Header {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = HEADER_SIZE;

    /** Strength of the crypto/MAC key */
    strength: KeyStrength;
    /** 12-byte nonce used for encryption */
    nonce: Buffer;
    /** 14-byte tag used for checking the user's decryption key */
    headerMAC: Buffer;
    /** Length of the ciphertext, in bytes */
    ctLen: number;

    constructor(strength: KeyStrength, nonce: Buffer, headerMAC: Buffer, ctLen: number) {
        this.strength = strength;
        this.nonce = nonce;
        this.headerMAC = headerMAC;
        this.ctLen = ctLen;
    }

    // Properties
    /** ID of the cipher suite used for encryption */
    get cipherID(): CipherID {
        return strengthToCipherID(this.strength);
    }

    // Methods
    /**
     * Generates the ExEF header.
     */
    toBuffer(): Buffer {
        const buffer = Buffer.alloc(HEADER_SIZE);
        buffer.write(MAGIC, 0, 4);
        buffer.writeUInt8(EXEF_VERSION, 4);
        buffer.writeUInt8(this.cipherID, 5);
        this.nonce.copy(buffer, 6);
        this.headerMAC.copy(buffer, 18);
        writeUInt64BE(buffer, this.ctLen, 32);
        return buffer;
    }

    /**
     * Parses the ExEF header.
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
            throw new Error(`Invalid cipher ID: ${cipherID}`);
        }

        const nonce = buffer.subarray(6, 18);
        const headerMAC = buffer.subarray(18, 32);
        const ctLen = readUInt64BE(buffer, 32);

        return new Header(cipherIDToStrength(cipherID), nonce, headerMAC, ctLen);
    }
}

/**
 * ExEF v3 footer.
 */
export class Footer {
    /** Size of the ExEF footer, in bytes */
    static footerSize: number = FOOTER_SIZE;

    /** 16-byte tag used for authentication */
    tag: Buffer;

    constructor(tag: Buffer) {
        this.tag = tag;
    }

    /**
     * Generates the ExEF footer.
     */
    toBuffer(): Buffer {
        const buffer = Buffer.alloc(FOOTER_SIZE);
        this.tag.copy(buffer, 0);
        return buffer;
    }

    /**
     * Parses the ExEF footer.
     */
    static fromBuffer(buffer: Buffer): Footer {
        if (buffer.length !== FOOTER_SIZE) {
            throw new Error(`footer must be ${FOOTER_SIZE} bytes (got ${buffer.length} bytes)`);
        }
        return new Footer(buffer);
    }
}

/**
 * Class that handles the encryption of ExEF v3 messages.
 */
export class Encryptor extends BaseEncryptor {
    /** 12-byte nonce used for encryption */
    readonly nonce: Buffer;

    private readonly _cryptoKey: Buffer;
    private readonly _macKey: Buffer;
    private readonly _cipher: GCMCipher;

    private _ctLen: number = -1;
    private _header: Header | null = null;

    private _headerSent = false;
    private _ctSentLen = 0;
    private _finalized = false;

    /**
     * Initializes the encryptor with a given key and nonce.
     *
     * @param key the main key as bytes
     * @param nonce the nonce used for AES-GCM encryption
     * @param strength crypto/MAC key strength, defaults to the length of `key` in bits
     * @throws {Error} if the nonce is not 12 bytes
     */
    constructor(key: Buffer, nonce: Buffer, strength?: KeyStrength) {
        super(key, strength);

        if (nonce.length !== NONCE_SIZE) {
            throw new Error(`nonce must be ${NONCE_SIZE} bytes`);
        }
        this.nonce = nonce;

        this._cryptoKey = genCryptoKey(key, nonce, this._strength / 8);
        this._macKey = genMacKey(key, nonce, this._strength / 8);
        this._cipher = new GCMCipher(this.alg, this._cryptoKey, nonce);

        this._contentMACInput = Buffer.alloc(Header.headerSize + Footer.footerSize);
    }

    // Properties
    get fullyProcessed(): boolean {
        if (this._ctLen === -1) {
            throw new Error("parameters must be set");
        }
        return this._ctSentLen === this._ctLen;
    }

    // Public methods
    setParams(length: number): void {
        super.setParams(length);

        // Ciphertext length is equal to plaintext length
        this._ctLen = length;

        const headerMAC = computeHeaderMAC(this._macKey, this._strength, this.nonce, length);
        this._header = new Header(this._strength, this.nonce, headerMAC, length);

        this._contentMACInput.set(this._header.toBuffer(), 0);
        this._contentMACInputOffset = HEADER_SIZE;
    }

    async update(data: Buffer): Promise<void> {
        this._queue.push(Buffer.from(this._cipher.update(data)));
        this._ctSentLen += data.length;
    }

    get(): Buffer {
        // Get header first
        if (!this._headerSent) {
            if (this._header === null) {
                throw new Error("parameters must be set");
            }
            this._headerSent = true;
            return this._header.toBuffer();
        }

        // Get body
        const body = this._drain();
        if (body.length > 0) {
            return body;
        }

        // Plaintext has been consumed; get footer
        if (!this._finalized && this._ctSentLen >= this._ctLen) {
            this._finalized = true;
            const footer = new Footer(Buffer.from(this._cipher.digest()));
            this._contentMACInput.set(footer.toBuffer(), this._contentMACInputOffset);
            this._contentMACInputOffset += FOOTER_SIZE;
            return footer.toBuffer();
        }

        return Buffer.alloc(0);
    }

    async encrypt(pt: Buffer): Promise<Buffer> {
        this.setParams(pt.length);
        await this.update(pt);
        return Buffer.concat([this.get(), this.get(), this.get()]); // First is header, then body, then footer
    }
}

/**
 * Class that handles the decryption of ExEF v3 messages.
 */
export class Decryptor extends BaseDecryptor {
    private _cipher: GCMDecipher | null = null;

    private _header: Header | null = null;
    private _footer: Footer | null = null;

    private _buffer: Buffer = Buffer.alloc(0);
    private _headerRemaining = HEADER_SIZE;
    private _footerRemaining = FOOTER_SIZE;
    private _ctLenLeft = -1;
    private _verified = false;

    // Properties
    get fullyProcessed(): boolean {
        return this._header !== null && this._footer !== null;
    }

    /**
     * The AES-GCM decipher, created on first access.
     *
     * Creating it verifies the header MAC, which is a quick check that the supplied key is (very
     * likely) correct. It is *not* an authentication check; that is the footer tag's job.
     *
     * @throws {Error} if the header has not been parsed yet
     * @throws {Error} if the header MAC does not match the computed header MAC
     */
    private get cipher(): GCMDecipher {
        if (this._cipher === null) {
            if (this._header === null) {
                throw new Error("header must be set");
            }

            const macKey = genMacKey(this.key, this._header.nonce, this._header.strength / 8);
            const computedHeaderMAC = computeHeaderMAC(
                macKey,
                this._header.strength,
                this._header.nonce,
                this._header.ctLen,
            );
            if (!computedHeaderMAC.equals(this._header.headerMAC)) {
                throw new Error("header MAC mismatch");
            }

            const cryptoKey = genCryptoKey(this.key, this._header.nonce, this._header.strength / 8);
            this._cipher = new GCMDecipher(algForStrength(this._header.strength), cryptoKey, this._header.nonce);
        }

        return this._cipher;
    }

    // Public methods
    async update(data: Buffer): Promise<void> {
        // Handle header
        if (this._headerRemaining > 0) {
            this._buffer = Buffer.concat([this._buffer, data]);
            this._headerRemaining -= data.length;

            if (this._headerRemaining > 0) {
                return;
            }

            // We have enough data to set the header
            const headerBuffer = this._buffer.subarray(0, HEADER_SIZE);
            this._header = Header.fromBuffer(headerBuffer);
            this._contentMACInput = Buffer.alloc(Header.headerSize + Footer.footerSize);
            this._contentMACInput.set(headerBuffer, 0);
            this._contentMACInputOffset = HEADER_SIZE;

            // Enqueue first part
            data = this._buffer.subarray(HEADER_SIZE);
            this._ctLenLeft = this._header.ctLen;
            this._buffer = Buffer.alloc(0);
        }

        // Handle ciphertext
        if (this._ctLenLeft > 0) {
            if (data.length <= this._ctLenLeft) {
                // Just put incoming data into the queue
                this._queue.push(Buffer.from(this.cipher.update(data)));
                this._ctLenLeft -= data.length;
                return;
            }

            // Incoming data contains part of footer
            this._queue.push(Buffer.from(this.cipher.update(data.subarray(0, this._ctLenLeft))));
            data = data.subarray(this._ctLenLeft);
            this._ctLenLeft = 0;
        }

        // Handle footer
        if (this._footerRemaining > 0) {
            this._buffer = Buffer.concat([this._buffer, data]);
            this._footerRemaining -= data.length;

            if (this._footerRemaining <= 0) {
                const footerBuffer = this._buffer.subarray(0, FOOTER_SIZE);
                this._footer = Footer.fromBuffer(footerBuffer);
                this._buffer = this._buffer.subarray(FOOTER_SIZE);

                this._contentMACInput.set(footerBuffer, this._contentMACInputOffset);
                this._contentMACInputOffset += FOOTER_SIZE;
            }
        }
    }

    get(): Buffer {
        return this._drain();
    }

    verify(): void {
        if (this._header === null || this._footer === null) {
            throw new Error("header and footer must be set");
        }
        if (this._buffer.length > 0) {
            throw new Error("trailing data after footer");
        }
        if (this._verified) {
            return;
        }

        this.cipher.setAuthTag(this._footer.tag);
        try {
            this.cipher.verify();
        } catch {
            throw new Error("MAC check failed");
        }
    }

    async decrypt(exefData: Buffer): Promise<Buffer> {
        await this.update(exefData);
        const output = this.get();
        this.verify();
        return output;
    }
}

/**
 * Processor for version 3 of the Excalibur Encryption Format (ExEF).
 */
export default class ExEFv3 {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = HEADER_SIZE;
    /** Size of the ExEF footer, in bytes */
    static footerSize: number = FOOTER_SIZE;
    /** Size of the ExEF additional (non-plaintext) data, in bytes */
    static additionalSize: number = ADDITIONAL_SIZE;
    /** ExEF version number */
    static version: number = EXEF_VERSION;

    /** Encryption key */
    readonly key: Buffer;
    /** 12-byte nonce used for encryption */
    readonly nonce: Buffer;

    /** Encryptor object */
    readonly encryptor: Encryptor;
    /** Decryptor object */
    readonly decryptor: Decryptor;

    /**
     * Initializes an ExEF v3 object.
     *
     * @param key the key to use for encryption and decryption
     * @param nonce the 12-byte nonce to use for encryption; if not provided, a random nonce is
     *      generated
     * @param strength the key strength to use for encryption, defaults to the length of `key` in
     *      bits
     */
    constructor(key: Buffer, nonce?: Buffer, strength?: KeyStrength) {
        if (![128, 192, 256].includes(key.length * 8)) {
            throw new Error("keysize must be 128, 192, or 256");
        }

        this.key = key;
        this.nonce = nonce ?? randomBytes(NONCE_SIZE);
        this.encryptor = new Encryptor(key, this.nonce, strength);
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

    /** The content MAC input buffer, if available */
    get contentMACInput(): Buffer | null {
        if (this.encryptor.contentMACInput !== null) {
            return this.encryptor.contentMACInput;
        }
        return this.decryptor.contentMACInput;
    }

    // Convenience methods
    /**
     * Encrypts the given data.
     *
     * @param data the data to encrypt
     * @returns a promise that resolves to the encrypted data
     */
    async encrypt(data: Buffer): Promise<Buffer> {
        return this.encryptor.encrypt(data);
    }

    /**
     * Decrypts the given data.
     *
     * @param data the encrypted data
     * @returns a promise that resolves to the decrypted data
     * @throws {Error} if the header or footer have not been set
     * @throws {Error} if the footer is not valid (e.g., wrong tag)
     */
    async decrypt(data: Buffer): Promise<Buffer> {
        return this.decryptor.decrypt(data);
    }

    // Other methods
    /**
     * Checks if the given data is valid ExEF v3 data.
     *
     * @param data the data to check
     * @returns whether the data is valid ExEF v3 data
     */
    static validate(data: Buffer): boolean {
        try {
            Header.fromBuffer(data.subarray(0, HEADER_SIZE));
            Footer.fromBuffer(data.subarray(data.length - FOOTER_SIZE));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Computes the total ExEF v3 size for a plaintext of the given length.
     *
     * @param plaintextLen the plaintext length, in bytes
     * @returns the total encrypted size, in bytes
     */
    static computeEncryptedSize(plaintextLen: number): number {
        return plaintextLen + ADDITIONAL_SIZE;
    }
}
