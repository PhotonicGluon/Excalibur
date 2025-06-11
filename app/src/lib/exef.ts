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
    version: number = 1;
    keysize: KeySize;
    nonce: Buffer;
    tag: Buffer;
    ciphertext: Buffer;

    constructor(keysize: KeySize, nonce: Buffer, tag: Buffer, ciphertext: Buffer) {
        this.keysize = keysize;
        this.nonce = nonce;
        this.tag = tag;
        this.ciphertext = ciphertext;
    }

    // Properties
    /** The encryption algorithm used in the ExEF format based on the key size */
    get alg(): Algorithm {
        return keysizeToAlg(this.keysize);
    }

    // Serializers
    toBuffer(): Buffer {
        let buffer = Buffer.alloc(64);
        buffer.write("ExEF", 0, 4);
        buffer.write(this.version.toString(16).padStart(4, "0"), 4, 2, "hex");
        buffer.write(this.keysize.toString(16).padStart(4, "0"), 6, 2, "hex");
        this.nonce.copy(buffer, 8);
        this.tag.copy(buffer, 40);
        buffer.write(this.ciphertext.length.toString(16).padStart(16, "0"), 56, 8, "hex");
        buffer = Buffer.concat([buffer, this.ciphertext]);
        return buffer;
    }

    static fromBuffer(buffer: Buffer): ExEF {
        console.debug(`Buffer to parse as ExEF: ${buffer.toString("hex")}`);
        if (buffer.length < 64) {
            throw new Error("Invalid ExEF buffer");
        }

        if (buffer.toString("ascii", 0, 4) !== "ExEF") {
            throw new Error("Invalid ExEF buffer");
        }

        const version = parseInt(buffer.toString("hex", 4, 6), 16);
        const keysize = parseInt(buffer.toString("hex", 6, 8), 16);

        if (keysize !== 128 && keysize !== 192 && keysize !== 256) {
            throw new Error(`Invalid key size: ${keysize}`);
        }

        let nonce = buffer.subarray(8, 40);
        const firstNullByte = nonce.indexOf(0);
        if (firstNullByte !== -1) {
            nonce = nonce.subarray(0, firstNullByte);
        }

        const tag = buffer.subarray(40, 56);
        const ciphertextLength = parseInt(buffer.toString("hex", 56, 64), 16);
        const ciphertext = buffer.subarray(64, 64 + ciphertextLength);

        return new ExEF(keysize, nonce, tag, ciphertext);
    }
}
