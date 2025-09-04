import { Buffer } from "buffer";
import { expose } from "comlink";

import ExEF from "@lib/exef";

const encryptionProcessor = {
    /**
     * Encrypts a stream of file data and reports progress.
     *
     * @param stream The readable stream of data to encrypt
     * @param vaultKey The key to use for encryption
     * @param fileSize The size of the file
     * @param onProgress A callback function to report progress (a value from 0 to 1)
     * @returns A promise that resolves with the encrypted file data as a Buffer
     */
    async processStream(
        stream: ReadableStream<Buffer>,
        vaultKey: Buffer,
        fileSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Buffer> {
        // Create the encryption stream inside the worker
        const exef = new ExEF(vaultKey, undefined, "encrypt");
        const encryptedStream = exef.encryptStream(fileSize, stream);
        const reader = encryptedStream.getReader();
        let data: Buffer = Buffer.from([]);

        const encryptedFileSize = fileSize + ExEF.additionalSize;

        // Read the stream and encrypt the data
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            data = Buffer.concat([data, value]);
            onProgress(data.length / encryptedFileSize);
            console.debug(
                `Encrypted ${data.length} / ${encryptedFileSize} (${((data.length / encryptedFileSize) * 100).toFixed(2)}%)`,
            );
        }

        return data;
    },
};

export type EncryptionProcessor = typeof encryptionProcessor;

// Expose the worker object to the main thread
expose(encryptionProcessor);
