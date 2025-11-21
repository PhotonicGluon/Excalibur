import { expose } from "comlink";

import ExEF from "@lib/exef";

const encryptionProcessor = {
    /**
     * Encrypts a stream of file data, reports progress in a callback, and returns a
     * doubly-encrypted blob.
     *
     * @param stream The readable stream of data to encrypt
     * @param vaultKey The vault key to use for encryption
     * @param e2eeKey The E2EE key to use for encryption
     * @param fileSize The size of the file
     * @param chunkSize The size of each chunk to encrypt
     * @param getSignalAborted A function that returns a promise that resolves to true if the
     *      encryption process is cancelled
     * @param onProgress A callback function to report progress (a value from 0 to 1)
     * @throws {Error} If the encryption process is cancelled
     * @returns A promise that resolves with the doubly-encrypted blob
     */
    async processStream(
        stream: ReadableStream<Buffer>,
        vaultKey: Buffer,
        e2eeKey: Buffer,
        fileSize: number,
        chunkSize: number,
        getSignalAborted: () => Promise<boolean>,
        onProgress: (progress: number) => void,
    ): Promise<Blob> {
        // Define ExEF encryption instances
        const vaultExEF = new ExEF(vaultKey, undefined, "encrypt");
        const e2eeExEF = new ExEF(e2eeKey, undefined, "encrypt");

        // Form nesting of streams for encryption
        const encryptedFileSize = fileSize + ExEF.additionalSize;
        const vStream = new ReadableStream<Buffer>({
            async start(controller) {
                const reader = vaultExEF.encryptStream(fileSize, stream, chunkSize).getReader();
                let offset = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    // TODO: This feels silly. Is there a better way?
                    if (await getSignalAborted()) throw new Error("Cancelled");
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
        const eStream = e2eeExEF.encryptStream(encryptedFileSize, vStream, chunkSize);

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
