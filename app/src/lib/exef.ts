import { CipherCCM, DecipherCCM, createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

import { chunkStream } from "@lib/util";

import hkdf from "./security/hkdf";

const EXEF_VERSION = 3;

type CipherID = 1 | 2 | 3;
type KeySize = 128 | 192 | 256;
type Algorithm = "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm";

/**
 * Converts keysize to algorithm.
 *
 * @param keysize Key size
 * @returns Algorithm type
 */
function keysizeToAlg(keysize: KeySize): Algorithm {
    return `aes-${keysize}-gcm`;
}

function cipherIDToKeysize(cipherID: CipherID): KeySize {
    if (cipherID === 1) {
        return 128;
    } else if (cipherID === 2) {
        return 192;
    } else {
        return 256;
    }
}

/**
 * ExEF header.
 */
export class ExEFHeader {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = 40;

    /** ID of the cipher suite used for encryption */
    cipherID: CipherID;
    /** 12-byte nonce used for encryption */
    nonce: Buffer;
    /** 14-byte tag used for checking the user's decryption key */
    headerMAC: Buffer;
    /** Length of the ciphertext, in bytes */
    ctLen: number;

    constructor(cipherID: CipherID, nonce: Buffer, headerMAC: Buffer, ctLen: number) {
        this.cipherID = cipherID;
        this.nonce = nonce;
        this.headerMAC = headerMAC;
        this.ctLen = ctLen;
    }

    /**
     * Generates the ExEF header.
     */
    toBuffer(): Buffer {
        const buffer = Buffer.alloc(ExEFHeader.headerSize);
        buffer.write("ExEF", 0, 4);
        buffer.write(EXEF_VERSION.toString(16).padStart(2, "0"), 4, 1, "hex");
        buffer.write(this.cipherID.toString(16).padStart(2, "0"), 5, 1, "hex");
        this.nonce.copy(buffer, 6);
        this.headerMAC.copy(buffer, 18);
        buffer.write(this.ctLen.toString(16).padStart(16, "0"), 32, 8, "hex");
        return buffer;
    }

    /**
     * Parses the ExEF header.
     */
    static fromBuffer(buffer: Buffer): ExEFHeader {
        if (buffer.length !== ExEFHeader.headerSize) {
            throw new Error(`header must be ${ExEFHeader.headerSize} bytes (got ${buffer.length} bytes)`);
        }

        if (buffer.toString("ascii", 0, 4) !== "ExEF") {
            throw new Error("data must start with 'ExEF'");
        }

        const version = parseInt(buffer.toString("hex", 4, 5), 16);
        if (version !== EXEF_VERSION) {
            throw new Error(`version must be ${EXEF_VERSION}`);
        }

        const cipherID = parseInt(buffer.toString("hex", 5, 6), 16);
        if (cipherID !== 1 && cipherID !== 2 && cipherID !== 3) {
            throw new Error(`Invalid cipher ID: ${cipherID}`);
        }

        const nonce = buffer.subarray(6, 18);
        const headerMAC = buffer.subarray(18, 32);
        const ctLen = parseInt(buffer.toString("hex", 32, 40), 16);

        return new ExEFHeader(cipherID, nonce, headerMAC, ctLen);
    }
}

/**
 * ExEF footer.
 */
export class ExEFFooter {
    /** Size of the ExEF footer, in bytes */
    static footerSize: number = 16;

    /** 16-byte tag used for authentication */
    tag: Buffer;

    constructor(tag: Buffer) {
        this.tag = tag;
    }

    /**
     * Generates the ExEF footer.
     */
    toBuffer(): Buffer {
        const buffer = Buffer.alloc(ExEFFooter.footerSize);
        this.tag.copy(buffer, 0);
        return buffer;
    }

    /**
     * Parses the ExEF footer.
     */
    static fromBuffer(buffer: Buffer): ExEFFooter {
        if (buffer.length !== ExEFFooter.footerSize) {
            throw new Error(`footer must be ${ExEFFooter.footerSize} bytes (got ${buffer.length} bytes)`);
        }
        return new ExEFFooter(buffer);
    }
}

/**
 * Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
 */
export default class ExEF {
    static headerSize: number = ExEFHeader.headerSize;
    static footerSize: number = ExEFFooter.footerSize;
    static additionalSize: number = ExEFHeader.headerSize + ExEFFooter.footerSize;
    static version: number = EXEF_VERSION;

    /** Encryption key */
    key: Buffer;
    /** 12-byte nonce used for encryption */
    nonce: Buffer;

    /** Internal cipher used for encryption or decryption */
    readonly _cipher: CipherCCM | DecipherCCM;
    private _cryptoKey: Buffer;
    private _macKey: Buffer;

    constructor(key: Buffer, nonce?: Buffer, mode: "encrypt" | "decrypt" = "encrypt") {
        this.key = key;

        if (!nonce) {
            nonce = randomBytes(12);
        }
        this.nonce = nonce;

        this._cryptoKey = this._genKey(key, nonce, Buffer.from("ExEF Crypto Key"));
        this._macKey = this._genKey(key, nonce, Buffer.from("ExEF MAC Key"));

        if (mode === "encrypt") {
            this._cipher = createCipheriv(this.alg, this._cryptoKey, this.nonce);
        } else {
            this._cipher = createDecipheriv(this.alg, this._cryptoKey, this.nonce);
        }
    }

    // Properties
    /** The cipher ID used for encryption */
    get cipherID(): CipherID {
        if (this.keysize === 128) {
            return 1;
        } else if (this.keysize === 192) {
            return 2;
        } else {
            return 3;
        }
    }

    /** Size of the AES key in bits */
    get keysize(): KeySize {
        return (8 * this.key.length) as KeySize;
    }

    /** The encryption algorithm used in the ExEF format based on the key size */
    get alg(): Algorithm {
        return keysizeToAlg(this.keysize);
    }

    // Helper methods
    /**
     * Generates a key using HKDF.
     */
    private _genKey(key: Buffer, nonce: Buffer, context: Buffer): Buffer {
        return hkdf("sha256", key, nonce, context, key.length);
    }

    private _getHeaderMAC(ctLen: number) {
        const header = new ExEFHeader(
            this.cipherID,
            this.nonce,
            Buffer.alloc(14), // We first set the header MAC to all zeros
            ctLen,
        );
        const hmac = createHmac("sha256", this._macKey);
        hmac.update(header.toBuffer());
        return hmac.digest().subarray(0, 14);
    }

    // Public methods
    /**
     * Encrypts the given data.
     *
     * @param data The data to be encrypted, as bytes
     * @returns The ExEF bytes
     */
    encrypt(data: Buffer): Buffer {
        const cipher = this._cipher as CipherCCM;

        // Encrypt
        const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();

        // Form the output
        const headerMAC = this._getHeaderMAC(ciphertext.length);
        const header = new ExEFHeader(this.cipherID, this.nonce, headerMAC, ciphertext.length);
        const footer = new ExEFFooter(tag);
        return Buffer.concat([header.toBuffer(), ciphertext, footer.toBuffer()]);
    }

    /**
     * Encrypts the given stream of plaintext data.
     *
     * @param ptLen Plaintext length
     * @param ptStream Stream of plaintext
     * @param chunkSize Size of each chunk
     * @returns A stream of ExEF bytes
     */
    encryptStream(ptLen: number, ptStream: ReadableStream<Buffer>, chunkSize: number): ReadableStream<Buffer> {
        const headerMAC = this._getHeaderMAC(ptLen);
        const header = new ExEFHeader(this.cipherID, this.nonce, headerMAC, ptLen);
        const cipher = this._cipher as CipherCCM;
        const chunkingStream = chunkStream(ptStream, chunkSize);
        return new ReadableStream<Buffer>({
            async start(controller) {
                // Yield header
                controller.enqueue(header.toBuffer());

                // Send ciphertext
                const reader = chunkingStream.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.enqueue(cipher.final());
                        break;
                    }
                    const encBlock = cipher.update(value);
                    controller.enqueue(encBlock);
                }

                // Yield footer
                const tag = cipher.getAuthTag();
                const footer = new ExEFFooter(tag);
                controller.enqueue(footer.toBuffer());

                // Close stream
                controller.close();
            },
        });
    }

    /**
     * Decrypts the given ExEF data.
     *
     * @param key Key to use for decryption
     * @param exefData Data to decrypt
     * @returns plaintext
     * @throws {Error} If the cipher ID does not match the key size
     * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch)
     */
    static decrypt(key: Buffer, exefData: Buffer): Buffer {
        const header = ExEFHeader.fromBuffer(exefData.subarray(0, ExEFHeader.headerSize));
        const footer = ExEFFooter.fromBuffer(
            exefData.subarray(exefData.length - ExEFFooter.footerSize, exefData.length),
        );
        if (cipherIDToKeysize(header.cipherID) != key.length * 8) {
            throw new Error(`cipher ID ${header.cipherID} does not match key size ${key.length * 8}`);
        }

        const ciphertext = exefData.subarray(ExEFHeader.headerSize, ExEFHeader.headerSize + header.ctLen);

        const instance = new ExEF(key, header.nonce, "decrypt");
        const cipher = instance._cipher as DecipherCCM;
        cipher.setAuthTag(footer.tag);

        const plaintext = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
        return plaintext;
    }

    /**
     *
     * @param key Key to use for decryption
     * @param exefStream Stream of ExEF bytes
     * @param chunkSize Size of each chunk
     * @returns A stream of plaintext bytes
     * @throws {Error} If the header is not received properly
     * @throws {Error} If the cipher ID does not match the key size
     * @throws {Error} If the ciphertext is not received properly
     * @throws {Error} If the data cannot be decrypted (e.g., tag mismatch)
     */
    static decryptStream(
        key: Buffer,
        exefStream: ReadableStream<Uint8Array>,
        chunkSize: number,
    ): ReadableStream<Uint8Array> {
        const chunkingStream = chunkStream(exefStream, chunkSize);
        return new ReadableStream<Uint8Array>({
            async start(controller) {
                const reader = chunkingStream.getReader();

                // Receive header
                let buffer = Buffer.from([]);
                while (buffer.length < ExEFHeader.headerSize) {
                    const { done, value } = await reader.read();
                    if (done) {
                        throw new Error("header not received");
                    }
                    buffer = Buffer.concat([buffer, value]);
                }

                const header = ExEFHeader.fromBuffer(buffer.subarray(0, ExEFHeader.headerSize));
                buffer = buffer.subarray(ExEFHeader.headerSize);
                if (cipherIDToKeysize(header.cipherID) != key.length * 8) {
                    throw new Error(`cipher ID ${header.cipherID} does not match key size ${key.length * 8}`);
                }

                // Set up cipher
                const instance = new ExEF(key, header.nonce, "decrypt");
                const cipher = instance._cipher as DecipherCCM;

                // Decrypt the ciphertext
                let remainingLen = header.ctLen;
                while (remainingLen > 0) {
                    // If buffer empty, read from stream
                    if (buffer.length == 0) {
                        const { done, value } = await reader.read();
                        if (done) {
                            throw new Error("ciphertext not fully received");
                        }
                        buffer = Buffer.concat([buffer, value]);
                    }

                    if (buffer.length >= remainingLen) {
                        // Buffer contains part of footer
                        controller.enqueue(cipher.update(buffer.subarray(0, remainingLen)));
                        buffer = buffer.subarray(remainingLen);
                        remainingLen = 0;
                    } else {
                        // Buffer is just the ciphertext
                        controller.enqueue(cipher.update(buffer));
                        remainingLen -= buffer.length;
                        buffer = Buffer.from([]);
                    }
                }

                // Get remainder of last part
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    buffer = Buffer.concat([buffer, value]);
                }

                // Check tag
                const footer = ExEFFooter.fromBuffer(buffer);
                cipher.setAuthTag(footer.tag);
                controller.enqueue(cipher.final());

                // Close stream
                controller.close();
            },
        });
    }

    /**
     * Decrypts the given ExEF data and parses it as JSON.
     *
     * @param key Key to use for decryption
     * @param exefData Data to decrypt
     * @param parse Whether to parse the decrypted data as JSON
     * @returns The decrypted JSON data
     * @throws {Error} If the keysize does not match
     * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch)
     */
    static decryptJSON<T>(key: Buffer, exefData: Buffer, parse: boolean = true): T {
        const decrypted = ExEF.decrypt(key, exefData);
        if (parse) {
            return JSON.parse(decrypted.toString("utf-8")) as T;
        }
        return decrypted as T;
    }

    /**
     * Decrypts the response data using the provided key if the response is encrypted.
     *
     * @param key Key to use for decryption
     * @param response The HTTP response containing potentially encrypted data
     * @param parse Whether to parse the decrypted data as JSON
     * @returns A promise that resolves to the decrypted data, or the original data if not encrypted
     * @throws {Error} If the keysize does not match
     * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch)
     */
    static async decryptResponse<T>(key: Buffer, response: Response, parse: boolean = true): Promise<T> {
        let data: T;
        if (response.headers.get("X-Encrypted") === "true") {
            const arrayBuffer = await response.arrayBuffer();
            const responseData = Buffer.from(arrayBuffer);
            data = ExEF.decryptJSON<T>(key, responseData, parse);
        } else {
            data = (await response.json()) as T;
        }

        return data;
    }
}
