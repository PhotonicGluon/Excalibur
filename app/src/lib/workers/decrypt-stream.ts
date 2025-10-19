import { Buffer } from "buffer";
import { expose } from "comlink";

import ExEF from "@lib/exef";

const decryptionProcessor = {
    /**
     * Decrypts a stream of file data and reports progress.
     * @param encryptedStream The readable stream of doubly-encrypted data
     * @param vaultKey The key to use for decryption
     * @param e2eeKey The E2EE key to use for decryption, or `null` if not E2EE encrypted
     * @param fileSize The final, decrypted size of the file
     * @param onProgress A callback function to report progress (a value from 0 to 1)
     * @returns A promise that resolves with the decrypted file data as a Blob
     */
    async processStream(
        encryptedStream: ReadableStream<Uint8Array>,
        vaultKey: Buffer,
        e2eeKey: Buffer | null,
        fileSize: number,
        chunkSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        const vStream = e2eeKey ? ExEF.decryptStream(e2eeKey, encryptedStream, chunkSize) : encryptedStream;
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                const reader = ExEF.decryptStream(vaultKey, vStream, chunkSize).getReader();
                let offset = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }

                    controller.enqueue(value);
                    offset += value.length;
                    onProgress(offset / fileSize);
                    console.debug(`Decrypted ${offset} / ${fileSize} (${((offset / fileSize) * 100).toFixed(2)}%)`);
                }
            },
        });
        return await new Response(stream).blob();
    },
};

export type DecryptionProcessor = typeof decryptionProcessor;

// Expose the worker object to the main thread
expose(decryptionProcessor);
