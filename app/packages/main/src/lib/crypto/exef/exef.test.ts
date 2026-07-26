import { expect } from "vitest";

import { sha256 } from "@lib/crypto/hashing";
import { chunkData, collectStream } from "@lib/util";
import ExEF, { ExEFv3, ExEFVersion, identifyVersion } from "./index";

const KEY = Buffer.from("111111111111111111111111", "utf-8");
const NONCE = Buffer.from("abababababababababababab", "hex");
const SALT = Buffer.from("ab".repeat(32), "hex");

/** ExEF v3 sample: the encryption of "Hello World!" under KEY and NONCE, at a strength of 192 bits */
const SAMPLE_V3_192 = Buffer.from(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22",
    "hex",
);

/** ExEF v4 sample: the encryption of "Hello World!" under KEY and SALT, at a strength of 192 bits */
const SAMPLE_V4_192 = Buffer.from(
    "45784546040210000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1064f786821458b87d29c30337365298f06",
    "hex",
);

/** The v4 encryption of the empty plaintext under KEY and SALT, at a strength of 192 bits */
const SAMPLE_V4_EMPTY = Buffer.from(
    "45784546040210000000010000000000000008abababababababababababababababababababababababababababababababab00000000002c433d76b017c99929344fbe0d2740ffa6c17a827f051b23",
    "hex",
);

// A plaintext large enough to span several chunks at an exponent of 12 (4 KiB chunks)
const MULTI_CHUNK_PT = Buffer.concat(Array(40).fill(Buffer.from(Array.from({ length: 256 }, (_, i) => i))));
const MULTI_CHUNK_SHA256 = "791a0ec5df3fcbde8931c5b2b67b07b212f642b385791b0c66a8e60bf3b7f3ae";

// Helper functions
function _generateInvalidMagic() {
    return Buffer.concat([Buffer.from("NOPE"), SAMPLE_V3_192.subarray(4)]);
}

function _generateInvalidVersion() {
    return Buffer.concat([SAMPLE_V3_192.subarray(0, 4), Buffer.from([0xff]), SAMPLE_V3_192.subarray(5)]);
}

// Tests
describe("identifyVersion", () => {
    it("should identify the supported versions", () => {
        expect(identifyVersion(SAMPLE_V3_192)).toBe(3);
        expect(identifyVersion(SAMPLE_V4_192)).toBe(4);
    });

    it("should reject a truncated stream", () => {
        expect(() => identifyVersion(SAMPLE_V4_192.subarray(0, 4))).toThrow("data too short");
    });

    it("should reject bad magic", () => {
        expect(() => identifyVersion(_generateInvalidMagic())).toThrow("data must start with 'ExEF'");
    });

    it("should reject an unsupported version", () => {
        expect(() => identifyVersion(_generateInvalidVersion())).toThrow("unsupported ExEF version: 255");
    });
});

describe("ExEF", () => {
    describe("sizing", () => {
        it("should compute the v3 encrypted size", () => {
            expect(ExEF.encryptedSize(12, 3)).toBe(SAMPLE_V3_192.length);
            expect(ExEF.overhead(12, 3)).toBe(ExEFv3.additionalSize);
        });

        it("should compute the v4 encrypted size", () => {
            expect(ExEF.encryptedSize(12)).toBe(SAMPLE_V4_192.length);
            expect(ExEF.encryptedSize(0)).toBe(SAMPLE_V4_EMPTY.length);
            expect(ExEF.encryptedSize(MULTI_CHUNK_PT.length, 4, 12)).toBe(10352);
        });

        it("should agree with what is actually produced", () => {
            for (const length of [0, 1, 12, 100, 1000, 5000, 10000]) {
                const parsed = new ExEF(KEY, { salt: SALT, strength: 192, exponent: 12 });
                expect(parsed.encrypt(Buffer.alloc(length)).length).toBe(parsed.encryptedSize(length));
            }
        });

        it("should default to producing version 4", () => {
            expect(identifyVersion(new ExEF(KEY).encrypt(Buffer.from("hi")))).toBe(4);
        });
    });

    describe("crypto", () => {
        describe("encrypt stream", () => {
            const versions = [3, 4];
            const streamChunkSizes = [12, 6, 1];
            const cryptoChunkSizes = [1, 4, 16, undefined];
            const pt = Buffer.from("Hello World!", "utf-8");

            for (const version of versions) {
                const expected = version === 3 ? SAMPLE_V3_192 : SAMPLE_V4_192;
                for (const streamChunkSize of streamChunkSizes) {
                    for (const cryptoChunkSize of cryptoChunkSizes) {
                        for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                            it(`ExEF v${version}, stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}`, async () => {
                                const parsed = new ExEF(KEY, {
                                    version: version as ExEFVersion,
                                    nonce: NONCE,
                                    salt: SALT,
                                    strength: 192,
                                });
                                const stream = parsed.encryptStream(
                                    pt.length,
                                    chunkData(pt, streamChunkSize),
                                    cryptoChunkSize,
                                );
                                const output = await collectStream(stream);
                                expect(output.toString("hex")).toBe(expected.toString("hex"));
                            });
                        }
                    }
                }
            }
        });

        it("(ExEF v4) should stream encrypt a multi-chunk payload", async () => {
            const parsed = new ExEF(KEY, { version: 4, salt: SALT, strength: 192, exponent: 12 });
            const stream = parsed.encryptStream(MULTI_CHUNK_PT.length, chunkData(MULTI_CHUNK_PT, 777), 333);
            expect(sha256(await collectStream(stream)).toString("hex")).toBe(MULTI_CHUNK_SHA256);
        });

        describe("decrypt stream", () => {
            const versions = [3, 4];
            const streamChunkSizes = [12, 6, 1];
            const cryptoChunkSizes = [1, 4, 16];
            for (const version of versions) {
                const ct = version === 3 ? SAMPLE_V3_192 : SAMPLE_V4_192;
                for (const streamChunkSize of streamChunkSizes) {
                    for (const cryptoChunkSize of cryptoChunkSizes) {
                        for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                            it(`ExEF v${version}, stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}`, async () => {
                                const stream = ExEF.decryptStream(KEY, chunkData(ct, streamChunkSize), cryptoChunkSize);
                                const output = await collectStream(stream);
                                expect(output.toString("utf-8")).toBe("Hello World!");
                            });
                        }
                    }
                }
            }
        });

        it("(ExEF v4) should stream-decrypt a multi-chunk payload", async () => {
            const parsed = new ExEF(KEY, { version: 4, salt: SALT, strength: 192, exponent: 12 });
            const encrypted = parsed.encrypt(MULTI_CHUNK_PT);
            const output = await collectStream(ExEF.decryptStream(KEY, chunkData(encrypted, 999), 501));
            expect(output.toString("hex")).toBe(MULTI_CHUNK_PT.toString("hex"));
        });

        it("(ExEF v4) should fail loudly on a truncated stream", async () => {
            const truncated = SAMPLE_V4_192.subarray(0, -1);
            const stream = ExEF.decryptStream(KEY, chunkData(truncated, 8), 8);
            await expect(collectStream(stream)).rejects.toThrow("incomplete ExEF data");
        });
    });

    describe("cross-version", () => {
        it("should auto-detect the version when decrypting", () => {
            expect(ExEF.decrypt(KEY, SAMPLE_V3_192).toString("utf-8")).toBe("Hello World!");
            expect(ExEF.decrypt(KEY, SAMPLE_V4_192).toString("utf-8")).toBe("Hello World!");
        });

        it("should validate both versions", () => {
            expect(ExEF.validate(SAMPLE_V3_192)).toBe(true);
            expect(ExEF.validate(SAMPLE_V4_192)).toBe(true);
            expect(ExEF.validate(_generateInvalidMagic())).toBe(false);
            expect(ExEF.validate(_generateInvalidVersion())).toBe(false);
        });

        it("should let `encryptStream()` select the version per call", async () => {
            const pt = Buffer.from("Hello World!", "utf-8");

            const v3 = new ExEF(KEY, { version: 3, nonce: NONCE, strength: 192 });
            const v3Out = await collectStream(v3.encryptStream(pt.length, chunkData(pt, 5), 4));
            expect(v3Out.toString("hex")).toBe(SAMPLE_V3_192.toString("hex"));

            const v4 = new ExEF(KEY, { version: 4, salt: SALT, strength: 192 });
            const v4Out = await collectStream(v4.encryptStream(pt.length, chunkData(pt, 5), 4));
            expect(v4Out.toString("hex")).toBe(SAMPLE_V4_192.toString("hex"));
        });
    });
});
