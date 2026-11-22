import { expect } from "vitest";

import { chunkData, collectStream } from "./stream";

const TEST_DATA = Buffer.from(
    "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
    "utf-8",
);

describe("chunkData", () => {
    const streamChunkSizes = [1, 4, 16, 64];

    for (const streamChunkSize of streamChunkSizes) {
        it(`should work for a stream chunk of ${streamChunkSize}`, async () => {
            const iterable = chunkData(TEST_DATA, streamChunkSize);
            const stream = iterable.getReader();

            let i = 0;
            while (true) {
                const { done, value } = await stream.read();
                if (done) {
                    break;
                }

                const streamOut = Buffer.from(value).toString("utf-8");
                const expectOut = Buffer.from(TEST_DATA.subarray(i, i + streamChunkSize)).toString("utf-8");
                expect(streamOut).toEqual(expectOut);
                i += streamChunkSize;
            }
        });
    }
});

describe("collectStream", () => {
    const streamChunkSizes = [1, 4, 16, 64];

    for (const streamChunkSize of streamChunkSizes) {
        it(`should collects all data for a stream chunk of ${streamChunkSize}`, async () => {
            const iterable = chunkData(TEST_DATA, streamChunkSize);
            const collected = await collectStream(iterable);
            expect(collected).toEqual(TEST_DATA);
        });
    }
});
