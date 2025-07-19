import { Buffer } from "buffer";
import * as Comlink from "comlink";

import ExEF from "@lib/exef";

const decryptionProcessor = {
    /**
     * Decrypts a stream of file data and reports progress.
     *
     * @param encryptedStream The readable stream of encrypted data.
     * @param vaultKey The key to use for decryption.
     * @param fileSize The final, decrypted size of the file.
     * @param onProgress A callback function to report progress (a value from 0 to 1).
     * @returns A promise that resolves with the decrypted file data as a Buffer.
     */
    async processStream(
        encryptedStream: ReadableStream<Uint8Array>,
        vaultKey: Buffer,
        fileSize: number,
        onProgress: (progress: number) => void,
    ): Promise<Buffer> {
        // Create the decryption stream inside the worker
        const decryptedStream = ExEF.decryptStream(vaultKey, encryptedStream);
        const reader = decryptedStream.getReader();
        let data: Buffer = Buffer.from([]);

        // Read the stream and decrypt the data
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            data = Buffer.concat([data, value]);
            onProgress(data.length / fileSize);
            console.debug(`Decrypted ${data.length} / ${fileSize} (${((data.length / fileSize) * 100).toFixed(2)}%)`);
        }

        return data;
    },
};

export type DecryptionProcessor = typeof decryptionProcessor;

// Expose the worker object to the main thread
Comlink.expose(decryptionProcessor);
