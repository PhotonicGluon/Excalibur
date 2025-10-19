import { expose } from "comlink";

import ExEF from "@lib/exef";

const encryptionProcessor = {
    /**
     * Encrypts a stream of file data, reports progress in a callback, and returns a
     * doubly-encrypted blob.
     *
     * @param name The name of the file to encrypt
     * @param stream The readable stream of data to encrypt
     * @param vaultKey The vault key to use for encryption
     * @param e2eeKey The E2EE key to use for encryption
     * @param fileSize The size of the file
     * @param chunkSize The size of each chunk to encrypt
     * @param onProgress A callback function to report progress (a value from 0 to 1)
     * @returns A promise that resolves with the doubly-encrypted blob
     */
    async processStream(
        stream: ReadableStream<Buffer>,
        vaultKey: Buffer,
        e2eeKey: Buffer,
        fileSize: number,
        chunkSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        const encryptedFileSize = fileSize + ExEF.additionalSize;

        const vaultEXEF = new ExEF(vaultKey, undefined, "encrypt");
        const e2eeEXEF = new ExEF(e2eeKey, undefined, "encrypt");

        const vStream = new ReadableStream<Buffer>({
            async start(controller) {
                const reader = vaultEXEF.encryptStream(fileSize, stream, chunkSize).getReader();
                let offset = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
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
        const eStream = e2eeEXEF.encryptStream(encryptedFileSize, vStream, chunkSize);
        return await new Response(eStream).blob();
    },
};

export type EncryptionProcessor = typeof encryptionProcessor;

// Expose the worker object to the main thread
expose(encryptionProcessor);
