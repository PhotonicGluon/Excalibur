import { Buffer } from "buffer";
import { expose } from "comlink";

import ExEF, { KeyStrength } from "@lib/crypto/exef";

globalThis.Buffer = Buffer;

const encryptionProcessor = {
    /** Flag to track cancellation */
    _isAborted: false,

    /**
     * Method exposed to main thread to abort encryption.
     *
     * May take a few seconds before the encryption process is actually cancelled.
     */
    abort() {
        this._isAborted = true;
    },

    /**
     * Encrypts a stream of file data, reports progress in a callback, and returns a
     * doubly-encrypted blob.
     *
     * @param stream the readable stream of data to encrypt
     * @param vaultKey the vault key to use for encryption
     * @param e2eeKey the E2EE key to use for encryption
     * @param fileSize the size of the file
     * @param keyStrength the key strength to use for encryption
     * @param chunkSizeExponent the chunk size exponent (where 2^exponent = chunk size)
     * @param onProgress a callback function to report progress (a value from 0 to 1)
     * @throws {Error} if the encryption process is cancelled
     * @returns a promise that resolves with the doubly-encrypted blob
     */
    async processStream(
        stream: ReadableStream<Buffer>,
        vaultKey: Buffer,
        e2eeKey: Buffer,
        fileSize: number,
        keyStrength: KeyStrength,
        chunkSizeExponent: number,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        this._isAborted = false;

        // Define ExEF encryption instances
        const vaultExEF = new ExEF(vaultKey, { version: 4, strength: keyStrength, exponent: chunkSizeExponent });
        const e2eeExEF = new ExEF(e2eeKey, { version: 4, strength: keyStrength, exponent: chunkSizeExponent });

        // Form nesting of streams for encryption. The vault-encrypted stream is what the E2EE
        // stream takes as its plaintext, so its declared length must be the *encrypted* size
        const encryptedFileSize = vaultExEF.encryptedSize(fileSize);
        const vStream = new ReadableStream<Buffer>({
            start: async (controller) => {
                const reader = vaultExEF.encryptStream(fileSize, stream).getReader();
                let offset = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    if (this._isAborted) {
                        await reader.cancel();
                        throw new Error("Cancelled");
                    }

                    controller.enqueue(value);
                    offset += value.length;
                    onProgress(offset / encryptedFileSize);
                    console.debug(
                        `Encrypted ${offset} / ${encryptedFileSize} (${((offset / encryptedFileSize) * 100).toFixed(2)}%)`,
                    );
                }

                controller.close();
            },
        });
        const eStream = e2eeExEF.encryptStream(encryptedFileSize, vStream);

        // Generate encrypted chunks
        const reader = eStream.getReader();
        const chunks: Buffer[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
        }

        // Return chunks as a blob
        return new Blob(chunks as BlobPart[]);
    },
};

export type EncryptionProcessor = typeof encryptionProcessor;

// Expose the worker object to the main thread
expose(encryptionProcessor);
