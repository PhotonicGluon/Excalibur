/**
 * Chunks a stream into smaller chunks.
 *
 * @param stream The stream to chunk
 * @param chunkSize The size of each chunk
 * @returns A stream of chunks
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

                buffer = Buffer.concat([buffer, value]);
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
