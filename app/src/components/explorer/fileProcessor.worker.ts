import { Buffer } from "buffer";
import * as Comlink from "comlink";

import ExEF from "@lib/exef";

const fileProcessor = {
    /**
     * Decrypts a stream of data and reports progress.
     *
     * @param dataStream The readable stream of encrypted data.
     * @param vaultKey The key to use for decryption.
     * @param fileSize The final, decrypted size of the file.
     * @param onProgress A callback function to report progress (a value from 0 to 1).
     * @returns A promise that resolves with the decrypted file data as a Buffer.
     */
    async processStream(
        dataStream: ReadableStream<Uint8Array>,
        vaultKey: Buffer,
        fileSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Buffer> {
        // Create the decryption stream inside the worker
        const fileDataStream = ExEF.decryptStream(vaultKey, dataStream);
        const reader = fileDataStream.getReader();
        let fileData: Buffer = Buffer.from([]);

        // Read the stream and decrypt the data
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            fileData = Buffer.concat([fileData, value]);
            onProgress(fileData.length / fileSize);
            console.debug(
                `Downloaded ${fileData.length} / ${fileSize} (${((fileData.length / fileSize) * 100).toFixed(2)}%)`,
            );
        }

        return fileData;
    },
};

export type FileProcessor = typeof fileProcessor;

// Expose the worker object to the main thread
Comlink.expose(fileProcessor);
