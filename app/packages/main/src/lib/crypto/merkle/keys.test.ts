import { expect } from "vitest";

import { MerkleKeys } from "./keys";

const KEY = Buffer.from("1".repeat(64), "hex");
const USER_ID = Buffer.from("0".repeat(32), "hex");

const CONTENT_MAC_KEY = Buffer.from("b2f74f7089faca62e95aab6e00b94724a16c1bcbfa78acc61bb3a25fdb08a8bf", "hex");

describe("MerkleKeys", () => {
    it("should derive the correct content MAC key", () => {
        expect(new MerkleKeys(KEY, USER_ID).content).toEqual(CONTENT_MAC_KEY);
    });
});
