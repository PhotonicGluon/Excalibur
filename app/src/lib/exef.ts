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
 * Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
 */
export class ExEF {
    static headerSize: number = 28;
    static version: number = 2;
    static footerSize: number = 16;

    keysize: KeySize;
    nonce: Buffer;
    tag: Buffer;
    ciphertext: Buffer;

    constructor(keysize: KeySize, nonce: Buffer, ciphertext: Buffer, tag: Buffer) {
        this.keysize = keysize;
        this.nonce = nonce;
        this.ciphertext = ciphertext;
        this.tag = tag;
    }

    // Properties
    /** The encryption algorithm used in the ExEF format based on the key size */
    get alg(): Algorithm {
        return keysizeToAlg(this.keysize);
    }

    // Serializers
    toBuffer(): Buffer {
        let buffer = Buffer.alloc(ExEF.headerSize);
        buffer.write("ExEF", 0, 4);
        buffer.write(ExEF.version.toString(16).padStart(4, "0"), 4, 2, "hex");
        buffer.write(this.keysize.toString(16).padStart(4, "0"), 6, 2, "hex");
        this.nonce.copy(buffer, 8);
        buffer.write(this.ciphertext.length.toString(16).padStart(16, "0"), 20, 8, "hex");
        buffer = Buffer.concat([buffer, this.ciphertext, this.tag]);
        return buffer;
    }

    static fromBuffer(buffer: Buffer): ExEF {
        console.debug(`Buffer to parse as ExEF: ${buffer.toString("hex")}`);
        if (buffer.toString("ascii", 0, 4) !== "ExEF") {
            throw new Error("Invalid ExEF buffer");
        }

        const version = parseInt(buffer.toString("hex", 4, 6), 16);
        if (version !== ExEF.version) {
            throw new Error(`Invalid ExEF version: ${version}`);
        }

        const keysize = parseInt(buffer.toString("hex", 6, 8), 16);
        if (keysize !== 128 && keysize !== 192 && keysize !== 256) {
            throw new Error(`Invalid key size: ${keysize}`);
        }

        const nonce = buffer.subarray(8, 20);

        const ciphertextLength = parseInt(buffer.toString("hex", 20, 28), 16);
        const ciphertext = buffer.subarray(ExEF.headerSize, ExEF.headerSize + ciphertextLength);

        const tag = buffer.subarray(ExEF.headerSize + ciphertextLength, ExEF.headerSize + ciphertextLength + 16);

        return new ExEF(keysize, nonce, ciphertext, tag);
    }
}
