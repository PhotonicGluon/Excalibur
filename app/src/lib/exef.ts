/**
 * Class that wraps the values needed for the Excalibur Encryption Format (ExEF).
 */
export class ExEF {
    version: number = 1;
    keysize: 128 | 192 | 256;
    nonce: Buffer;
    tag: Buffer;
    ciphertext: Buffer;

    constructor(keysize: 128 | 192 | 256, nonce: Buffer, tag: Buffer, ciphertext: Buffer) {
        this.keysize = keysize;
        this.nonce = nonce;
        this.tag = tag;
        this.ciphertext = ciphertext;
    }

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

        const nonce = buffer.subarray(8, 40);
        const tag = buffer.subarray(40, 56);
        const ciphertextLength = parseInt(buffer.toString("hex", 56, 64), 16);
        const ciphertext = buffer.subarray(64, 64 + ciphertextLength);

        return new ExEF(keysize, nonce, tag, ciphertext);
    }
}
