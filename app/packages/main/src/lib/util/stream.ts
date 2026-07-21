/**
 * Chunks a data buffer into smaller chunks as a stream.
 *
 * @param data the data to chunk
 * @param chunkSize the size of each chunk
 * @returns a stream of chunks
 */
export function chunkData(data: Buffer, chunkSize: number): ReadableStream<Buffer> {
    return new ReadableStream({
        start(controller) {
            for (let i = 0; i < data.length; i += chunkSize) {
                controller.enqueue(data.subarray(i, i + chunkSize));
            }
            controller.close();
        },
    });
}

/**
 * Chunks a stream into smaller chunks.
 *
 * @param stream the stream to chunk
 * @param chunkSize the size of each chunk
 * @returns a stream of chunks
 */
export function chunkStream(stream: ReadableStream<Uint8Array>, chunkSize: number): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
        async start(controller) {
            const reader = stream.getReader();
            let buffer: Uint8Array = new Uint8Array([]);
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer.length > 0) {
                        controller.enqueue(buffer);
                    }
                    controller.close();
                    break;
                }

                buffer = Buffer.concat([buffer, value]) as unknown as Uint8Array;
                if (buffer.length >= chunkSize) {
                    let i = 0;
                    for (; i < buffer.length; i += chunkSize) {
                        controller.enqueue(buffer.subarray(i, i + chunkSize));
                    }
                    buffer = buffer.subarray(i);
                }
            }
        },
    });
}

/**
 * Reads a stream fully into a single buffer.
 *
 * @param stream the stream to read
 * @returns a buffer containing all the data from the stream
 */
export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    let output: Buffer = Buffer.alloc(0);
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        output = Buffer.concat([output, value]);
    }
    return output;
}
