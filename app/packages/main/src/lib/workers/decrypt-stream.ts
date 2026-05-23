import { expose } from "comlink";

import ExEF from "@lib/crypto/exef";

const decryptionProcessor = {
    /**
     * Decrypts a doubly-encrypted stream of file data, reports progress in a callback, and returns
     * a decrypted blob.
     *
     * @param eStream The readable stream of doubly-encrypted data
     * @param vaultKey The vault key to use for decryption
     * @param e2eeKey The E2EE key to use for decryption, or `null` if not E2EE encrypted
     * @param fileSize The final, decrypted size of the file
     * @param chunkSize The size of each chunk to decrypt
     * @param onProgress A callback function to report progress (a value from 0 to 1)
     * @returns A promise that resolves with the decrypted file data as a Blob
     */
    async processStream(
        eStream: ReadableStream<Uint8Array>,
        vaultKey: Buffer,
        e2eeKey: Buffer | null,
        fileSize: number,
        chunkSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        // Form nesting of streams for decryption
        const vStream = e2eeKey ? ExEF.decryptStream(e2eeKey, eStream, chunkSize) : eStream;
        const stream = ExEF.decryptStream(vaultKey, vStream, chunkSize);

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
