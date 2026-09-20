import { Buffer } from "buffer";
import { expose } from "comlink";

import ExEF from "@lib/crypto/exef";

globalThis.Buffer = Buffer;

const decryptionProcessor = {
    /**
     * Decrypts a doubly-encrypted stream of file data, reports progress in a callback, and returns
     * a decrypted blob.
     *
     * @param eStream the readable stream of doubly-encrypted data
     * @param vaultKey the vault key to use for decryption
     * @param e2eeKey the E2EE key to use for decryption, or `null` if not E2EE encrypted
     * @param fileSize the final, decrypted size of the file
     * @param onProgress a callback function to report progress (a value from 0 to 1)
     * @returns a promise that resolves with the decrypted file data as a Blob
     */
    async processStream(
        eStream: ReadableStream<Uint8Array>,
        vaultKey: Buffer,
        e2eeKey: Buffer | null,
        fileSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        // Form nesting of streams for decryption
        const vStream = e2eeKey ? new ExEF(e2eeKey).decryptStream(eStream) : eStream;
        const stream = new ExEF(vaultKey).decryptStream(vStream);

        // Generate decrypted chunks
        const reader = stream.getReader();
        let offset = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            chunks.push(value);
            offset += value.length;
            onProgress(offset / fileSize);
            console.debug(`Decrypted ${offset} / ${fileSize} (${((offset / fileSize) * 100).toFixed(2)}%)`);
        }

        // Return chunks as a blob
        return new Blob(chunks as BlobPart[]);
    },
};

export type DecryptionProcessor = typeof decryptionProcessor;

// Expose the worker object to the main thread
expose(decryptionProcessor);
