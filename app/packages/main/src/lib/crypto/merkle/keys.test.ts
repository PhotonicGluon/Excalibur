import { expect } from "vitest";

import { MerkleKeys } from "./keys";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");

const CONTENT_MAC_KEY = Buffer.from("1676e9386cf8cbfead3491f0778059f77a90f9e2043b6500196c2d8a6b83c3e1", "hex");

describe("MerkleKeys", () => {
    it("should derive the correct content MAC key", () => {
        expect(new MerkleKeys(KEY, USER_ID).content).toEqual(CONTENT_MAC_KEY);
    });
});
