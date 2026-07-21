import createHash from "create-hash";
import { expect } from "vitest";

import { chunkData, collectStream } from "@lib/util";
import ExEF, { ExEFv4Header, KeyStrength } from "./index";

const KEY = Buffer.from("111111111111111111111111", "utf-8");
const SALT = Buffer.from("ab".repeat(32), "hex");

const SAMPLE_V4_128 = Buffer.from(
    "45784546040110000000010000000000000014abababababababababababababababababababababababababababababababab00000000004475b1f137fc94c3fa32ba0da54fda90fa872e05c57dcafbf5e9f6784fb9809e85a7d931",
    "hex",
);
const SAMPLE_V4_192 = Buffer.from(
    "45784546040210000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1064f786821458b87d29c30337365298f06",
    "hex",
);
const SAMPLE_V4_256 = Buffer.from(
    "45784546040310000000010000000000000014abababababababababababababababababababababababababababababababab00000000003c22d65579fd59e217b8689b33372458017df3f86f56bdd30f54f834ca6356d295cb954e",
    "hex",
);
const EXEFS_V4 = {
    128: SAMPLE_V4_128,
    192: SAMPLE_V4_192,
    256: SAMPLE_V4_256,
};

/** The encryption of the empty plaintext under KEY and SALT, at a strength of 192 bits */
const SAMPLE_V4_EMPTY = Buffer.from(
    "45784546040210000000010000000000000008abababababababababababababababababababababababababababababababab00000000002c433d76b017c99929344fbe0d2740ffa6c17a827f051b23",
    "hex",
);

// A plaintext large enough to span several chunks at an exponent of 12 (4 KiB chunks)
const MULTI_CHUNK_PT = Buffer.concat(Array(40).fill(Buffer.from(Array.from({ length: 256 }, (_, i) => i))));
const MULTI_CHUNK_HEADER =
    "4578454604020c000000030000000000002808abababababababababababababababababababababababababababababababab0000000000";
const MULTI_CHUNK_SHA256 = "791a0ec5df3fcbde8931c5b2b67b07b212f642b385791b0c66a8e60bf3b7f3ae";

// Helper functions
function _sha256(data: Buffer): string {
    return createHash("sha256").update(data).digest("hex");
}

// Tests
describe("ExEF v4", () => {
    it("should handle parsing", () => {
        const header = ExEFv4Header.fromBuffer(SAMPLE_V4_192.subarray(0, ExEFv4Header.headerSize));
        expect(header.cipherID).toBe(2);
        expect(header.exponent).toBe(16);
        expect(header.chunkSize).toBe(65536);
        expect(header.chunkCount).toBe(1);
        expect(header.paddedSize).toBe(20);
        expect(header.salt.toString("hex")).toBe(SALT.toString("hex"));
        expect(header.strength).toBe(192);
        expect(header.bodySize).toBe(36);
        expect(header.computeChunkPlaintextSize(0)).toBe(20);
    });

    it("should round-trip a header", () => {
        const header = ExEFv4Header.fromBuffer(SAMPLE_V4_192.subarray(0, ExEFv4Header.headerSize));
        expect(header.toBuffer().toString("hex")).toBe(SAMPLE_V4_192.subarray(0, 56).toString("hex"));
    });

    describe("should handle encryption", () => {
        const strengths = Object.keys(EXEFS_V4).map((x) => parseInt(x));
        const expected = Object.values(EXEFS_V4);
        for (let i = 0; i < 3; i++) {
            it(`strength of ${strengths[i]}`, () => {
                const parsed = new ExEF(KEY, { salt: SALT, strength: strengths[i] as KeyStrength });
                expect(parsed.encrypt(Buffer.from("Hello World!", "utf-8")).toString("hex")).toBe(
                    expected[i].toString("hex"),
                );
            });
        }
    });

    it("should encrypt the empty plaintext", () => {
        const parsed = new ExEF(KEY, { salt: SALT, strength: 192 });
        expect(parsed.encrypt(Buffer.alloc(0)).toString("hex")).toBe(SAMPLE_V4_EMPTY.toString("hex"));
    });

    it("should decrypt the empty plaintext", () => {
        expect(ExEF.decrypt(KEY, SAMPLE_V4_EMPTY).length).toBe(0);
    });

    it("should encrypt across several chunks", () => {
        const parsed = new ExEF(KEY, { salt: SALT, strength: 192, exponent: 12 });
        const output = parsed.encrypt(MULTI_CHUNK_PT);
        expect(output.subarray(0, 56).toString("hex")).toBe(MULTI_CHUNK_HEADER);
        expect(output.length).toBe(10352);
        expect(_sha256(output)).toBe(MULTI_CHUNK_SHA256);
    });

    it("should decrypt across several chunks", () => {
        const parsed = new ExEF(KEY, { salt: SALT, strength: 192, exponent: 12 });
        const decrypted = ExEF.decrypt(KEY, parsed.encrypt(MULTI_CHUNK_PT));
        expect(decrypted.toString("hex")).toBe(MULTI_CHUNK_PT.toString("hex"));
    });

    describe("should handle decryption", () => {
        const strengths = Object.keys(EXEFS_V4).map((x) => parseInt(x));
        const exefs = Object.values(EXEFS_V4);
        for (let i = 0; i < 3; i++) {
            it(`strength of ${strengths[i]}`, () => {
                expect(ExEF.decrypt(KEY, exefs[i]).toString("utf-8")).toBe("Hello World!");
            });
        }
    });

    describe("encrypt stream", () => {
        const streamChunkSizes = [12, 6, 1];
        const cryptoChunkSizes = [1, 4, 16];
        const strengths = Object.keys(EXEFS_V4).map((x) => parseInt(x));
        const expected = Object.values(EXEFS_V4);
        const pt = Buffer.from("Hello World!", "utf-8");

        for (const streamChunkSize of streamChunkSizes) {
            for (const cryptoChunkSize of cryptoChunkSizes) {
                for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                    it(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}, strength ${strengths[strengthIdx]}`, async () => {
                        const parsed = new ExEF(KEY, {
                            salt: SALT,
                            strength: strengths[strengthIdx] as KeyStrength,
                        });
                        const stream = parsed.encryptStream(pt.length, chunkData(pt, streamChunkSize), cryptoChunkSize);
                        const output = await collectStream(stream);
                        expect(output.toString("hex")).toBe(expected[strengthIdx].toString("hex"));
                    });
                }
            }
        }
    });

    it("should stream a multi-chunk payload", async () => {
        const parsed = new ExEF(KEY, { salt: SALT, strength: 192, exponent: 12 });
        const stream = parsed.encryptStream(MULTI_CHUNK_PT.length, chunkData(MULTI_CHUNK_PT, 777), 333);
        expect(_sha256(await collectStream(stream))).toBe(MULTI_CHUNK_SHA256);
    });

    describe("decrypt stream", () => {
        const streamChunkSizes = [12, 6, 1];
        const cryptoChunkSizes = [1, 4, 16];
        const exefs = Object.values(EXEFS_V4);

        for (const streamChunkSize of streamChunkSizes) {
            for (const cryptoChunkSize of cryptoChunkSizes) {
                for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                    it(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}`, async () => {
                        const stream = ExEF.decryptStream(
                            KEY,
                            chunkData(exefs[strengthIdx], streamChunkSize),
                            cryptoChunkSize,
                        );
                        const output = await collectStream(stream);
                        expect(output.toString("utf-8")).toBe("Hello World!");
                    });
                }
            }
        }
    });

    it("should stream-decrypt a multi-chunk payload", async () => {
        const parsed = new ExEF(KEY, { salt: SALT, strength: 192, exponent: 12 });
        const encrypted = parsed.encrypt(MULTI_CHUNK_PT);
        const output = await collectStream(ExEF.decryptStream(KEY, chunkData(encrypted, 999), 501));
        expect(output.toString("hex")).toBe(MULTI_CHUNK_PT.toString("hex"));
    });

    describe("error handling", () => {
        /**
         * Returns a copy of the 192-bit sample with the byte at `offset` set to `value`.
         */
        function _mutate(offset: number, value: number): Buffer {
            const copy = Buffer.from(SAMPLE_V4_192);
            copy[offset] = value;
            return copy;
        }

        it("should reject an unknown cipher ID", () => {
            expect(() => ExEF.decrypt(KEY, _mutate(5, 0x04))).toThrow("unknown cipher ID");
        });

        it("should reject an out-of-range exponent", () => {
            expect(() => ExEF.decrypt(KEY, _mutate(6, 0x0b))).toThrow("exponent must be between 12 and 30");
            expect(() => ExEF.decrypt(KEY, _mutate(6, 0x1f))).toThrow("exponent must be between 12 and 30");
        });

        it("should reject non-zero reserved bytes", () => {
            expect(() => ExEF.decrypt(KEY, _mutate(51, 0x01))).toThrow("reserved bytes must be zero");
        });

        it("should reject a mismatched chunk count", () => {
            expect(() => ExEF.decrypt(KEY, _mutate(10, 0x02))).toThrow("chunk count does not match padded size");
            expect(() => ExEF.decrypt(KEY, _mutate(10, 0x00))).toThrow("chunk count must be at least 1");
        });

        it("should reject a padded size that is not a PADME output", () => {
            // PADME(1000) is 1024, so a padded size of 8 + 1000 can never have been produced
            const copy = Buffer.from(SAMPLE_V4_192);
            copy.writeUInt16BE(1008, 17);
            expect(() => ExEF.decrypt(KEY, copy)).toThrow("padded size is not a valid PADME output");
        });

        it("should reject a tampered tag", () => {
            const copy = Buffer.from(SAMPLE_V4_192);
            copy[copy.length - 1] ^= 0xff;
            expect(() => ExEF.decrypt(KEY, copy)).toThrow("chunk authentication failed");
        });

        it("should reject a tampered header, since it is bound to every chunk", () => {
            // Flipping a salt byte keeps the header structurally valid but changes the derived key
            const copy = Buffer.from(SAMPLE_V4_192);
            copy[19] ^= 0xff;
            expect(() => ExEF.decrypt(KEY, copy)).toThrow("chunk authentication failed");
        });

        it("should reject the wrong key", () => {
            const fakeKey = Buffer.from(KEY);
            fakeKey[0] = 255 - fakeKey[0];
            expect(() => ExEF.decrypt(fakeKey, SAMPLE_V4_192)).toThrow("chunk authentication failed");
        });

        it("should reject a truncated stream", () => {
            expect(() => ExEF.decrypt(KEY, SAMPLE_V4_192.subarray(0, -1))).toThrow("incomplete ExEF data");
        });

        it("should reject trailing data", () => {
            const copy = Buffer.concat([SAMPLE_V4_192, Buffer.from([0x00])]);
            expect(() => ExEF.decrypt(KEY, copy)).toThrow("trailing data after final chunk");
        });

        it("should reject an out-of-range exponent when encrypting", () => {
            expect(() => new ExEF(KEY, { salt: SALT, exponent: 31 })).toThrow("exponent must be between 12 and 30");
        });

        it("should reject a salt of the wrong size", () => {
            expect(() => new ExEF(KEY, { salt: Buffer.alloc(16) })).toThrow("salt must be 32 bytes");
        });

        it("should fail loudly on a truncated stream", async () => {
            const truncated = SAMPLE_V4_192.subarray(0, -1);
            const stream = ExEF.decryptStream(KEY, chunkData(truncated, 8), 8);
            await expect(collectStream(stream)).rejects.toThrow("incomplete ExEF data");
        });
    });
});
