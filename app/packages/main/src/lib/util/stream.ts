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
