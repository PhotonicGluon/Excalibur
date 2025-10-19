import { expect } from "vitest";

import ExEF, { ExEFFooter, ExEFHeader } from "./exef";

const KEY = Buffer.from("111111111111111111111111", "utf-8");
const NONCE = Buffer.from("abababababababababababab", "hex");
const SAMPLE_EXEF = Buffer.from(
    "45784546000200c0abababababababababababab000000000000000c2e1a886b4ae6f2ac2f83f3b357f98e42277c8456d9ecae0dc2aa400e",
    "hex",
);

test("ExEF parsing", () => {
    // Parse header
    const header = ExEFHeader.fromBuffer(SAMPLE_EXEF.subarray(0, ExEFHeader.headerSize));
    expect(header.keysize).toBe(192);
    expect(header.nonce.toString("hex")).toBe("abababababababababababab");
    expect(header.ctLen).toBe(12);

    // Parse footer
    const footer = ExEFFooter.fromBuffer(SAMPLE_EXEF.subarray(SAMPLE_EXEF.length - ExEFFooter.footerSize));
    expect(footer.tag.toString("hex")).toBe("57f98e42277c8456d9ecae0dc2aa400e");
});

test("ExEF encrypt", () => {
    const parsed = new ExEF(KEY, NONCE);
    expect(parsed.encrypt(Buffer.from("Hello World!", "utf-8")).toString("hex")).toBe(SAMPLE_EXEF.toString("hex"));
});

describe("ExEF encrypt stream", () => {
    const pt = Buffer.from("Hello World!", "utf-8");
    const streamChunkSizes = [12, 6, 4, 1];
    const cryptoChunkSizes = [1, 4, 16];

    for (const streamChunkSize of streamChunkSizes) {
        for (const cryptoChunkSize of cryptoChunkSizes) {
            test(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}`, async () => {
                const parsed = new ExEF(KEY, NONCE);
                const iterable = new ReadableStream({
                    start(controller) {
                        for (let i = 0; i < pt.length; i += streamChunkSize) {
                            controller.enqueue(pt.subarray(i, i + streamChunkSize));
                        }
                        controller.close();
                    },
                });

                const stream = parsed.encryptStream(pt.length, iterable, cryptoChunkSize);
                const reader = stream.getReader();
                let output: Buffer = Buffer.from([]);
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    output = Buffer.concat([output, value]);
                }
                expect(output.toString("hex")).toBe(SAMPLE_EXEF.toString("hex"));
            });
        }
    }
});

test("ExEF decrypt", () => {
    const ptTest = ExEF.decrypt(KEY, SAMPLE_EXEF);
    expect(ptTest.toString("utf-8")).toBe("Hello World!");
});

describe("ExEF decrypt stream", () => {
    const streamChunkSizes = [12, 6, 4, 1];
    const cryptoChunkSizes = [1, 4, 16];

    for (const streamChunkSize of streamChunkSizes) {
        for (const cryptoChunkSize of cryptoChunkSizes) {
            test(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}`, async () => {
                const iterable = new ReadableStream({
                    start(controller) {
                        for (let i = 0; i < SAMPLE_EXEF.length; i += streamChunkSize) {
                            controller.enqueue(SAMPLE_EXEF.subarray(i, i + streamChunkSize));
                        }
                        controller.close();
                    },
                });

                const stream = ExEF.decryptStream(KEY, iterable, cryptoChunkSize);
                const reader = stream.getReader();
                let output: Buffer = Buffer.from([]);
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    output = Buffer.concat([output, value]);
                }
                expect(output.toString("utf-8")).toBe("Hello World!");
            });
        }
    }
});

// test("Invalid ExEF", () => {
//     // TODO: Add more to this test

//     expect(() => ExEF.fromBuffer(Buffer.from("NOPE", "hex"))).toThrow();
// });
