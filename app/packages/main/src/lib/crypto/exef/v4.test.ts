import { expect } from "vitest";

import { sha256 } from "@lib/crypto/hashing";

import { ExEFv4, ExEFv4Header, KeyStrength } from "./index";

// Keys of each supported strength
const KEY_128 = Buffer.from("1".repeat(16), "utf-8");
const KEY_192 = Buffer.from("1".repeat(24), "utf-8");
const KEY_256 = Buffer.from("1".repeat(32), "utf-8");
const KEYS = { 128: KEY_128, 192: KEY_192, 256: KEY_256 };

const SALT = Buffer.from("ab".repeat(32), "hex");

// Deterministic vectors generated with salt = 0xab * 32, exponent = 12, plaintext = b"Hello World!"
const SAMPLE_V4_128 = Buffer.from(
    "4578454604010c000000010000000000000014abababababababababababababababababababababababababababababababab0000000000f37280d2e17260e417fcfa9ab22ea25127b62d6df1bc07b6e5b0cc73afc42b21924ed9d6",
    "hex",
);
const SAMPLE_V4_192 = Buffer.from(
    "4578454604020c000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1069048561680c74081d0e1b8cfa3aa8f00",
    "hex",
);
const SAMPLE_V4_256 = Buffer.from(
    "4578454604030c000000010000000000000014abababababababababababababababababababababababababababababababab0000000000a02d6cf1fad6752d572f82c56fe91ca4e3ca3c9e1a99754bf46184c34089615120463626",
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
/**
 * Returns a copy of the 192-bit sample with the byte at `offset` set to `value`.
 */
function _mutate(offset: number, value: number): Buffer {
    const copy = Buffer.from(SAMPLE_V4_192);
    copy[offset] = value;
    return copy;
}

// Tests
describe("ExEF v4", () => {
    it("should handle parsing", () => {
        const header = ExEFv4Header.fromBuffer(SAMPLE_V4_192.subarray(0, ExEFv4Header.headerSize));
        expect(header.cipherID).toBe(2);
        expect(header.exponent).toBe(12);
        expect(header.chunkSize).toBe(4096);
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

    describe("should handle encryption", async () => {
        const strengths = Object.keys(EXEFS_V4).map((x) => parseInt(x));
        const expected = Object.values(EXEFS_V4);
        for (let i = 0; i < 3; i++) {
            const strength = strengths[i] as KeyStrength;
            it(`strength of ${strength}`, async () => {
                const exef = new ExEFv4(KEYS[strength], SALT, strength, 12);
                const ct = await exef.encrypt(Buffer.from("Hello World!", "utf-8"));
                expect(ct.toString("hex")).toBe(expected[i].toString("hex"));
            });
        }
    });

    describe("should handle decryption", () => {
        const strengths = Object.keys(EXEFS_V4).map((x) => parseInt(x));
        const exefs = Object.values(EXEFS_V4);
        for (let i = 0; i < 3; i++) {
            const strength = strengths[i] as KeyStrength;
            it(`strength of ${strength}`, async () => {
                const exef = new ExEFv4(KEYS[strength]);
                const pt = await exef.decrypt(exefs[i]);
                expect(pt.toString("utf-8")).toBe("Hello World!");
            });
        }
    });

    it("should encrypt the empty plaintext", async () => {
        const parsed = new ExEFv4(KEYS[192], SALT, 192);
        expect((await parsed.encrypt(Buffer.alloc(0))).toString("hex")).toBe(SAMPLE_V4_EMPTY.toString("hex"));
    });

    it("should decrypt the empty plaintext", async () => {
        expect((await new ExEFv4(KEYS[192]).decrypt(SAMPLE_V4_EMPTY)).length).toBe(0);
    });

    it("should encrypt across several chunks", async () => {
        const parsed = new ExEFv4(KEYS[192], SALT, 192, 12);
        const output = await parsed.encrypt(MULTI_CHUNK_PT);
        expect(output.subarray(0, 56).toString("hex")).toBe(MULTI_CHUNK_HEADER);
        expect(output.length).toBe(10352);
        expect(sha256(output).toString("hex")).toBe(MULTI_CHUNK_SHA256);
    });

    it("should decrypt across several chunks", async () => {
        const parsed = new ExEFv4(KEYS[192]);
        const decrypted = await new ExEFv4(KEYS[192]).decrypt(await parsed.encrypt(MULTI_CHUNK_PT));
        expect(decrypted.toString("hex")).toBe(MULTI_CHUNK_PT.toString("hex"));
    });

    describe("error handling", () => {
        it("should reject an unknown cipher ID", () => {
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(5, 0x04))).rejects.toThrow("unknown cipher ID");
        });

        it("should reject an out-of-range exponent", () => {
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(6, 0x03))).rejects.toThrow(
                "exponent must be between",
            );
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(6, 0x1f))).rejects.toThrow(
                "exponent must be between",
            );
        });

        it("should reject non-zero reserved bytes", () => {
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(51, 0x01))).rejects.toThrow(
                "reserved bytes must be zero",
            );
        });

        it("should reject a mismatched chunk count", () => {
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(10, 0x02))).rejects.toThrow(
                "chunk count does not match padded size",
            );
            expect(async () => new ExEFv4(KEYS[192]).decrypt(_mutate(10, 0x00))).rejects.toThrow(
                "chunk count must be at least 1",
            );
        });

        it("should reject a padded size that is not a PADME output", () => {
            // PADME(1000) is 1024, so a padded size of 8 + 1000 can never have been produced
            const copy = Buffer.from(SAMPLE_V4_192);
            copy.writeUInt16BE(1008, 17);
            expect(async () => new ExEFv4(KEYS[192]).decrypt(copy)).rejects.toThrow(
                "padded size is not a valid PADME output",
            );
        });

        it("should reject a tampered tag", () => {
            const copy = Buffer.from(SAMPLE_V4_192);
            copy[copy.length - 1] ^= 0xff;
            expect(async () => new ExEFv4(KEYS[192]).decrypt(copy)).rejects.toThrow("chunk authentication failed");
        });

        it("should reject a tampered header, since it is bound to every chunk", () => {
            // Flipping a salt byte keeps the header structurally valid but changes the derived key
            const copy = Buffer.from(SAMPLE_V4_192);
            copy[19] ^= 0xff;
            expect(async () => new ExEFv4(KEYS[192]).decrypt(copy)).rejects.toThrow("chunk authentication failed");
        });

        it("should reject the wrong key", () => {
            const fakeKey = Buffer.from(KEYS[192]);
            fakeKey[0] = 255 - fakeKey[0];
            expect(async () => new ExEFv4(fakeKey).decrypt(SAMPLE_V4_192)).rejects.toThrow(
                "chunk authentication failed",
            );
        });

        it("should reject a truncated stream", () => {
            expect(async () => new ExEFv4(KEYS[192]).decrypt(SAMPLE_V4_192.subarray(0, -1))).rejects.toThrow(
                "incomplete ExEF data",
            );
        });

        it("should reject trailing data", () => {
            const copy = Buffer.concat([SAMPLE_V4_192, Buffer.from([0x00])]);
            expect(async () => new ExEFv4(KEYS[192]).decrypt(copy)).rejects.toThrow("trailing data after final chunk");
        });

        it("should reject a salt of the wrong size", () => {
            expect(() => new ExEFv4(KEYS[192], Buffer.alloc(16))).toThrow("salt must be 32 bytes");
        });

        it("should reject an invalid key size", () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => new ExEFv4(KEYS[192], SALT, 12 as any)).toThrow("strength must be 128, 192, or 256");
        });

        it("should reject an out-of-range exponent when encrypting", () => {
            expect(() => new ExEFv4(KEYS[192], SALT, undefined, 31)).toThrow("exponent must be betwee");
        });
    });
});
