import { expect } from "vitest";

import ExEF, { ExEFVersion } from "@lib/crypto/exef";

import { MerkleKeys } from "./keys";
import { computeContentMAC, getContentMACInput } from "./mac";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const MERKLE_KEYS = new MerkleKeys(KEY, USER_ID);

const EXEF_V3_SAMPLE = Buffer.from(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c01a2d354eb2527742fa264b5b50d70e450d7892345f7ce463da59d22",
    "hex",
);
const EXEF_V4_SAMPLE = Buffer.from(
    "4578454604020c000000010000000000000014abababababababababababababababababababababababababababababababab00000000002c433d76b017c9955f8ed40be919a8a7c1efd1069048561680c74081d0e1b8cfa3aa8f00",
    "hex",
);

const CONTENT_MAC_INPUT_V3 = Buffer.from(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c" + // Header
        "b50d70e450d7892345f7ce463da59d22", // Footer
    "hex",
);
const CONTENT_MAC_INPUT_V4 = Buffer.from("9048561680c74081d0e1b8cfa3aa8f00", "hex"); // Tag of the single chunk

const CONTENT_MAC_V3 = Buffer.from("80be86f05b8d6743a30437918c6a14c5fd9348ef41dd765dabfa4e03297eeca0", "hex");
const CONTENT_MAC_V4 = Buffer.from("1763d8635acefb8601bf34fad277b8aee899bd13cfd0fedf464277d8f2213696", "hex");

describe("getContentMACInput", () => {
    it("should compute the correct MAC input for sample ExEFv3 data", () => {
        expect(getContentMACInput(EXEF_V3_SAMPLE).toString("hex")).toEqual(CONTENT_MAC_INPUT_V3.toString("hex"));
    });

    it("should compute the correct MAC input for sample ExEFv4 data", () => {
        expect(getContentMACInput(EXEF_V4_SAMPLE).toString("hex")).toEqual(CONTENT_MAC_INPUT_V4.toString("hex"));
    });

    describe("should compute the same thing as an ExEF instance", () => {
        const VERSIONS: ExEFVersion[] = [3, 4];
        const PT_LENGTHS = [4, 16, 64, 256, 1024];

        for (const version of VERSIONS) {
            describe(`for version ${version}`, () => {
                for (const ptLength of PT_LENGTHS) {
                    const plaintext = Buffer.alloc(ptLength, "A");
                    it(`of plaintext with length ${ptLength}`, async () => {
                        // Encryption
                        const encryptionExEF = new ExEF(KEY, { version, exponent: 4 });
                        const encrypted = await encryptionExEF.encrypt(plaintext);
                        const macInput = getContentMACInput(encrypted);
                        expect(encryptionExEF.contentMACInput.toString("hex")).toEqual(macInput.toString("hex"));

                        // Decryption
                        const decryptionExEF = new ExEF(KEY);
                        await decryptionExEF.decrypt(encrypted);
                        expect(decryptionExEF.contentMACInput.toString("hex")).toEqual(macInput.toString("hex"));
                    });
                }
            });
        }
    });
});

describe("computeContentMAC", () => {
    it("should compute the correct MAC for ExEFv3", () => {
        expect(computeContentMAC(MERKLE_KEYS, CONTENT_MAC_INPUT_V3)).toEqual(CONTENT_MAC_V3);
    });

    it("should compute the correct MAC for ExEFv4", () => {
        expect(computeContentMAC(MERKLE_KEYS, CONTENT_MAC_INPUT_V4)).toEqual(CONTENT_MAC_V4);
    });
});
