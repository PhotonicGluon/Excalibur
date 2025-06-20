import { CipherCCM, DecipherCCM, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const EXEF_VERSION = 2;

export type KeySize = 128 | 192 | 256;
export type Algorithm = "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm";

/**
 * Converts algorithm to keysize.
 *
 * @param alg Algorithm type
 * @returns Keysize
 */
export function algToKeysize(alg: Algorithm): KeySize {
    const matches = alg.match(/aes-(?<keysize>128|192|256)-gcm/)!;
    return parseInt(matches.groups!.keysize) as KeySize;
}

/**
 * Converts keysize to algorithm.
 *
 * @param keysize Key size
 * @returns Algorithm type
 */
export function keysizeToAlg(keysize: KeySize): Algorithm {
    return `aes-${keysize}-gcm`;
}

/**
 * ExEF header.
 */
export class ExEFHeader {
    /** Size of the ExEF header, in bytes */
    static headerSize: number = 28;

    /** Size of the AES key, in bits */
    keysize: KeySize;
    /** Nonce */
    nonce: Buffer;
    /** Length of the ciphertext, in bytes */
    ctLen: number;

    constructor(keysize: KeySize, nonce: Buffer, ctLen: number) {
        this.keysize = keysize;
        this.nonce = nonce;
        this.ctLen = ctLen;
    }

    /**
     * Generates the ExEF header.
     */
    toBuffer(): Buffer {
        let buffer = Buffer.alloc(ExEFHeader.headerSize);
        buffer.write("ExEF", 0, 4);
        buffer.write(EXEF_VERSION.toString(16).padStart(4, "0"), 4, 2, "hex");
        buffer.write(this.keysize.toString(16).padStart(4, "0"), 6, 2, "hex");
        this.nonce.copy(buffer, 8);
        buffer.write(this.ctLen.toString(16).padStart(16, "0"), 20, 8, "hex");
        return buffer;
    }

    /**
     * Parses the ExEF header.
     */
    static fromBuffer(buffer: Buffer): ExEFHeader {
        if (buffer.length !== ExEFHeader.headerSize) {
            throw new Error(`header must be ${ExEFHeader.headerSize} bytes`);
        }

        if (buffer.toString("ascii", 0, 4) !== "ExEF") {
            throw new Error("data must start with ExEF");
        }

        const version = parseInt(buffer.toString("hex", 4, 6), 16);
        if (version !== EXEF_VERSION) {
            throw new Error(`version must be ${version}`);
        }

        const keysize = parseInt(buffer.toString("hex", 6, 8), 16);
        if (keysize !== 128 && keysize !== 192 && keysize !== 256) {
            throw new Error(`Invalid key size: ${keysize}`);
        }

        const nonce = buffer.subarray(8, 20);
        const ctLen = parseInt(buffer.toString("hex", 20, 28), 16);

        return new ExEFHeader(keysize, nonce, ctLen);
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
        let buffer = Buffer.alloc(ExEFFooter.footerSize);
        this.tag.copy(buffer, 0);
        return buffer;
    }

    /**
     * Parses the ExEF footer.
     */
    static fromBuffer(buffer: Buffer): ExEFFooter {
        if (buffer.length !== ExEFFooter.footerSize) {
            throw new Error(`footer must be ${ExEFFooter.footerSize} bytes`);
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
    static version: number = EXEF_VERSION;

    /** Encryption key */
    key: Buffer;
    /** 12-byte nonce used for encryption */
    nonce: Buffer;

    /** Internal cipher used for encryption or decryption */
    readonly _cipher: CipherCCM | DecipherCCM;

    constructor(key: Buffer, nonce?: Buffer, mode: "encrypt" | "decrypt" = "encrypt") {
        this.key = key;

        if (!nonce) {
            nonce = randomBytes(12);
        }
        this.nonce = nonce;

        if (mode === "encrypt") {
            this._cipher = createCipheriv(this.alg, key, nonce);
        } else {
            this._cipher = createDecipheriv(this.alg, key, nonce);
        }
    }

    // Properties
    /** Size of the AES key in bits */
    get keysize(): KeySize {
        return (8 * this.key.length) as KeySize;
    }

    /** The encryption algorithm used in the ExEF format based on the key size */
    get alg(): Algorithm {
        return keysizeToAlg(this.keysize);
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
        const header = new ExEFHeader(this.keysize, this.nonce, ciphertext.length);
        const footer = new ExEFFooter(tag);
        return Buffer.concat([header.toBuffer(), ciphertext, footer.toBuffer()]);
    }

    /**
     * Encrypts the given stream of plaintext data.
     *
     * @param ptLen Plaintext length
     * @param ptStream Stream of plaintext
     * @returns A stream of ExEF bytes
     */
    encryptStream(ptLen: number, ptStream: ReadableStream<Buffer>): ReadableStream<Buffer> {
        const header = new ExEFHeader(this.keysize, this.nonce, ptLen); // Ciphertext length is the same as plaintext length
        const cipher = this._cipher as CipherCCM;

        return new ReadableStream<Buffer>({
            async start(controller) {
                // Yield header
                controller.enqueue(header.toBuffer());

                // Send ciphertext
                const reader = ptStream.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.enqueue(cipher.final()); // TODO: Is this correct?
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
     * Encrypts the given JSON-serializable data.
     *
     * @param data The data to be encrypted, as a JSON serializable object
     * @returns The ExEF bytes
     */
    encryptJSON(data: any): Buffer {
        return this.encrypt(Buffer.from(JSON.stringify(data)));
    }

    /**
     * Decrypts the given ExEF data.
     *
     * @param key Key to use for decryption
     * @param exefData Data to decrypt
     * @returns plaintext
     * @throws {Error} If the keysize does not match
     * @throws {Error} If the response data cannot be decrypted (e.g., tag mismatch)
     */
    static decrypt(key: Buffer, exefData: Buffer): Buffer {
        const header = ExEFHeader.fromBuffer(exefData.subarray(0, ExEFHeader.headerSize));
        const footer = ExEFFooter.fromBuffer(
            exefData.subarray(exefData.length - ExEFFooter.footerSize, exefData.length),
        );
        if (header.keysize != key.length * 8) {
            throw new Error(`keysize must be ${header.keysize}`);
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
     * @returns A stream of plaintext bytes
     * @throws {Error} If the header is not received properly
     * @throws {Error} If the keysize does not match
     * @throws {Error} If the ciphertext is not received properly
     * @throws {Error} If the data cannot be decrypted (e.g., tag mismatch)
     */
    static decryptStream(key: Buffer, exefStream: ReadableStream<Buffer>): ReadableStream<Buffer> {
        return new ReadableStream<Buffer>({
            async start(controller) {
                const reader = exefStream.getReader();

                // Receive header
                let initialBuffer = Buffer.from([]);
                while (initialBuffer.length < ExEFHeader.headerSize) {
                    const { done, value } = await reader.read();
                    if (done) {
                        throw new Error("header not received");
                    }
                    initialBuffer = Buffer.concat([initialBuffer, value]);
                }

                const header = ExEFHeader.fromBuffer(initialBuffer.subarray(0, ExEFHeader.headerSize));
                if (header.keysize != key.length * 8) {
                    throw new Error(`keysize must be ${header.keysize}`);
                }

                // Decrypt remaining part of the initial buffer
                const instance = new ExEF(key, header.nonce, "decrypt");
                const cipher = instance._cipher as DecipherCCM;
                initialBuffer = initialBuffer.subarray(ExEFHeader.headerSize);
                controller.enqueue(cipher.update(initialBuffer));

                // Decrypt the remaining ciphertext
                let remainingLen = header.ctLen - initialBuffer.length;
                let lastPart: Buffer<ArrayBufferLike> = Buffer.from([]);
                while (remainingLen > 0) {
                    const { done, value } = await reader.read();
                    if (done) {
                        throw new Error("ciphertext not fully received");
                    }
                    if (value.length >= remainingLen) {
                        lastPart = value.subarray(remainingLen);
                        controller.enqueue(cipher.update(value.subarray(0, remainingLen)));
                        remainingLen = 0;
                    } else {
                        controller.enqueue(cipher.update(value));
                        remainingLen -= value.length;
                    }
                }

                // Get remainder of last part
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    lastPart = Buffer.concat([lastPart, value]);
                }

                // Check tag
                const footer = ExEFFooter.fromBuffer(lastPart);
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
