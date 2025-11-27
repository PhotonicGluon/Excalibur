import { expect } from "vitest";

import { chunkStream } from "./stream";

describe("chunkStream", () => {
    const data = Buffer.from(
        "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
        "utf-8",
    );
    const streamChunkSizes = [1, 4, 16, 64];
    const outputChunkSizes = [1, 4, 16, 64];

    for (const streamChunkSize of streamChunkSizes) {
        for (const outputChunkSize of outputChunkSizes) {
            test(`stream chunk ${streamChunkSize}, output chunk ${outputChunkSize}`, async () => {
                const iterable = new ReadableStream<Uint8Array>({
                    start(controller) {
                        for (let i = 0; i < data.length; i += streamChunkSize) {
                            controller.enqueue(data.subarray(i, i + streamChunkSize));
                        }
                        controller.close();
                    },
                });

                const stream = chunkStream(iterable, outputChunkSize);
                const reader = stream.getReader();

                let i = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    const streamOut = Buffer.from(value).toString("utf-8");
                    const expectOut = Buffer.from(data.subarray(i, i + outputChunkSize)).toString("utf-8");
                    expect(streamOut).toEqual(expectOut);
                    i += outputChunkSize;
                }
            });
        }
    }
});
