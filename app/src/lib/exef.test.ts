import ExEF, { ExEFFooter, ExEFHeader } from "./exef";

const KEY = Buffer.from("111111111111111111111111", "utf-8");
const NONCE = Buffer.from("abababababababababababab", "hex");
const SAMPLE_EXEF = Buffer.from(
    "45784546000200c0abababababababababababab00000000000000052e3aa84b6a21eec34610517ba0479a0ed0dd374cba",
    "hex",
);

test("ExEF parsing", () => {
    // Parse header
    const header = ExEFHeader.fromBuffer(SAMPLE_EXEF.subarray(0, ExEFHeader.headerSize));
    expect(header.keysize).toBe(192);
    expect(header.nonce.toString("hex")).toBe("abababababababababababab");
    expect(header.ctLen).toBe(5);

    // Parse footer
    const footer = ExEFFooter.fromBuffer(SAMPLE_EXEF.subarray(SAMPLE_EXEF.length - ExEFFooter.footerSize));
    expect(footer.tag.toString("hex")).toBe("21eec34610517ba0479a0ed0dd374cba");
});

test("ExEF encrypt", () => {
    const parsed = new ExEF(KEY, NONCE);
    expect(parsed.encrypt(Buffer.from("HELLO", "utf-8")).toString("hex")).toBe(SAMPLE_EXEF.toString("hex"));
});

test("ExEF encrypt stream 1", async () => {
    const parsed = new ExEF(KEY, NONCE);
    const pt = Buffer.from("HELLO", "utf-8");
    const iterable = new ReadableStream({
        start(controller) {
            controller.enqueue(pt);
            controller.close();
        },
    });

    const stream = parsed.encryptStream(pt.length, iterable);
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

test("ExEF encrypt stream 2", async () => {
    const parsed = new ExEF(KEY, NONCE);
    const pt = Buffer.from("HELLO", "utf-8");
    const iterable = new ReadableStream({
        start(controller) {
            for (let i = 0; i < pt.length / 2; i++) {
                controller.enqueue(pt.subarray(i * 2, i * 2 + 2));
            }
            controller.close();
        },
    });

    const stream = parsed.encryptStream(pt.length, iterable);
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

test("ExEF decrypt", () => {
    const ptTest = ExEF.decrypt(KEY, SAMPLE_EXEF);
    expect(ptTest.toString("utf-8")).toBe("HELLO");
});

test("ExEF decrypt stream 1", async () => {
    const iterable = new ReadableStream({
        start(controller) {
            controller.enqueue(SAMPLE_EXEF);
            controller.close();
        },
    });

    const stream = ExEF.decryptStream(KEY, iterable);
    const reader = stream.getReader();
    let output: Buffer = Buffer.from([]);
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        output = Buffer.concat([output, value]);
    }
    expect(output.toString("utf-8")).toBe("HELLO");
});

test("ExEF decrypt stream 2", async () => {
    const iterable = new ReadableStream({
        start(controller) {
            for (let i = 0; i < SAMPLE_EXEF.length / 2; i++) {
                controller.enqueue(SAMPLE_EXEF.subarray(i * 2, i * 2 + 2));
            }
            controller.close();
        },
    });

    const stream = ExEF.decryptStream(KEY, iterable);
    const reader = stream.getReader();
    let output: Buffer = Buffer.from([]);
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        output = Buffer.concat([output, value]);
    }
    expect(output.toString("utf-8")).toBe("HELLO");
});

// test("Invalid ExEF", () => {
//     // TODO: Add more to this test

//     expect(() => ExEF.fromBuffer(Buffer.from("NOPE", "hex"))).toThrow();
// });
