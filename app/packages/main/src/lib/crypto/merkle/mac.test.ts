import { expect } from "vitest";

import { MerkleKeys } from "./keys";
import { computeContentMAC } from "./mac";

const KEY = Buffer.from("1".repeat(64), "hex");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const MERKLE_KEYS = new MerkleKeys(KEY, USER_ID);

const CONTENT_MAC_INPUT_V3 = Buffer.from(
    "457845460302abababababababababababab3a5a8758e2c946869e38d6ae9d7f000000000000000c" + // Header
        "b50d70e450d7892345f7ce463da59d22", // Footer
    "hex",
);
const CONTENT_MAC_INPUT_V4 = Buffer.from("9048561680c74081d0e1b8cfa3aa8f00", "hex"); // Tag of the single chunk

const CONTENT_MAC_V3 = Buffer.from("98405f16228681fad9c01bd6d74870adcf56fe745954f2b00f513b0bf686b3df", "hex");
const CONTENT_MAC_V4 = Buffer.from("d9dc08876f022d059028944c5ed215d12d0aec657004e67330a376c1aee00b9b", "hex");

describe("computeContentMAC", () => {
    it("should compute the correct MAC for V3", () => {
        expect(computeContentMAC(MERKLE_KEYS, CONTENT_MAC_INPUT_V3)).toEqual(CONTENT_MAC_V3);
    });

    it("should compute the correct MAC for V4", () => {
        expect(computeContentMAC(MERKLE_KEYS, CONTENT_MAC_INPUT_V4)).toEqual(CONTENT_MAC_V4);
    });
});
