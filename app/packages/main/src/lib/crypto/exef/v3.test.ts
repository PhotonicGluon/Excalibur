import { expect } from "vitest";

import { chunkData, collectStream } from "@lib/util";
import ExEF, { ExEFFooter, ExEFHeader, KeyStrength } from "./index";

const KEY = Buffer.from("111111111111111111111111", "utf-8");
const NONCE = Buffer.from("abababababababababababab", "hex");

const SAMPLE_V3_128 = Buffer.from(
    "457845460301abababababababababababab3ae89cecf3e7cb56042e43d824ec000000000000000cb52c1501910110d2afcb7b114b29d231367c43770ada41198c9a96a4",
    "hex",
);
const SAMPLE_V3_192 = Buffer.from(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22",
    "hex",
);
const SAMPLE_V3_256 = Buffer.from(
    "457845460303abababababababababababab86250f2fdf59840a66218d549ee7000000000000000c8dcad08960b097c68ae73d0c86a807d763605e0ebf6c40df88826657",
    "hex",
);
const EXEFS_V3 = {
    128: SAMPLE_V3_128,
    192: SAMPLE_V3_192,
    256: SAMPLE_V3_256,
};

// Helper functions
function _generateInvalidMagic() {
    return Buffer.concat([Buffer.from("NOPE"), SAMPLE_V3_192.subarray(4)]);
}

function _generateInvalidVersion() {
    return Buffer.concat([SAMPLE_V3_192.subarray(0, 4), Buffer.from([0xff]), SAMPLE_V3_192.subarray(5)]);
}

function _generateInvalidFooter() {
    return SAMPLE_V3_192.subarray(0, -1); // One byte short
}

function _generateInvalidTag() {
    return Buffer.concat([SAMPLE_V3_192.subarray(0, -1), Buffer.from([SAMPLE_V3_192[SAMPLE_V3_192.length - 1] + 1])]);
}

// Tests
describe("ExEF v3", () => {
    it("should handle parsing", () => {
        // Parse header
        const header = ExEFHeader.fromBuffer(SAMPLE_V3_192.subarray(0, ExEFHeader.headerSize));
        expect(header.cipherID).toBe(2);
        expect(header.nonce.toString("hex")).toBe("abababababababababababab");
        expect(header.headerMAC.toString("hex")).toBe("3a5a8758e2c946869e38d6ae9d7f");
        expect(header.ctLen).toBe(12);

        // Parse footer
        const footer = ExEFFooter.fromBuffer(SAMPLE_V3_192.subarray(SAMPLE_V3_192.length - ExEFFooter.footerSize));
        expect(footer.tag.toString("hex")).toBe("b50d70e450d7892345f7ce463da59d22");
    });

    describe("should handle encryption", () => {
        const strengths = Object.keys(EXEFS_V3).map((x) => parseInt(x));
        const expected = Object.values(EXEFS_V3);
        for (let i = 0; i < 3; i++) {
            it(`strength of ${strengths[i]}`, () => {
                const parsed = new ExEF(KEY, { version: 3, nonce: NONCE, strength: strengths[i] as KeyStrength });
                expect(parsed.encrypt(Buffer.from("Hello World!", "utf-8")).toString("hex")).toBe(
                    expected[i].toString("hex"),
                );
            });
        }
    });

    describe("encrypt stream", () => {
        const pt = Buffer.from("Hello World!", "utf-8");

        const streamChunkSizes = [12, 6, 4, 1];
        const cryptoChunkSizes = [1, 4, 16];
        const strengths = Object.keys(EXEFS_V3).map((x) => parseInt(x));
        const expected = Object.values(EXEFS_V3);

        for (const streamChunkSize of streamChunkSizes) {
            for (const cryptoChunkSize of cryptoChunkSizes) {
                for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                    it(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}, strength ${strengths[strengthIdx]}`, async () => {
                        const parsed = new ExEF(KEY, {
                            version: 3,
                            nonce: NONCE,
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

    describe("should handle decryption", () => {
        const strengths = Object.keys(EXEFS_V3).map((x) => parseInt(x));
        const exefs = Object.values(EXEFS_V3);
        for (let i = 0; i < 3; i++) {
            it(`strength of ${strengths[i]}`, () => {
                const ptTest = ExEF.decrypt(KEY, exefs[i]);
                expect(ptTest.toString("utf-8")).toBe("Hello World!");
            });
        }
    });

    describe("decrypt stream", () => {
        const streamChunkSizes = [12, 6, 4, 1];
        const cryptoChunkSizes = [1, 4, 16];
        const strengths = Object.keys(EXEFS_V3).map((x) => parseInt(x));
        const exefs = Object.values(EXEFS_V3);

        for (const streamChunkSize of streamChunkSizes) {
            for (const cryptoChunkSize of cryptoChunkSizes) {
                for (let strengthIdx = 0; strengthIdx < 3; strengthIdx++) {
                    it(`stream chunk ${streamChunkSize}, crypto chunk ${cryptoChunkSize}, strength ${strengths[strengthIdx]}`, async () => {
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

    describe("error handling", () => {
        it("should handle invalid key size", () => {
            expect(() => new ExEF(Buffer.from("123", "utf-8"), { version: 3, nonce: NONCE })).toThrow(
                "keysize must be 128, 192, or 256",
            );
        });

        it("should handle invalid nonce", () => {
            expect(() => new ExEF(KEY, { version: 3, nonce: Buffer.from("123", "utf-8") })).toThrow(
                "nonce must be 12 bytes",
            );
        });

        it("should handle invalid key", () => {
            const fakeKey = Buffer.from(KEY);
            fakeKey[0] = 255 - fakeKey[0];
            expect(() => ExEF.decrypt(fakeKey, SAMPLE_V3_192)).toThrow("header MAC mismatch");
        });

        it("should handle invalid magic", () => {
            expect(() => ExEF.decrypt(KEY, _generateInvalidMagic())).toThrow("data must start with 'ExEF'");
        });

        it("should handle invalid version", () => {
            expect(() => ExEF.decrypt(KEY, _generateInvalidVersion())).toThrow("unsupported ExEF version");
        });

        it("should handle invalid footer", () => {
            expect(() => ExEF.decrypt(KEY, _generateInvalidFooter())).toThrow();
        });

        it("should handle invalid tag", () => {
            expect(() => ExEF.decrypt(KEY, _generateInvalidTag())).toThrow("MAC check failed");
        });
    });
});
