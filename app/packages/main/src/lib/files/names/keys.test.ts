import { expect } from "vitest";

import { NameKeys } from "./keys";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const KEYS = new NameKeys(KEY, USER_ID);

describe("NameKeys", () => {
    it("should derive distinct keys", () => {
        expect(KEYS.enc).toHaveLength(32);
        expect(KEYS.tag).toHaveLength(32);
        expect(KEYS.enc.equals(KEYS.tag)).toBe(false);
    });

    it("should derive different keys for different users", () => {
        const other = new NameKeys(KEY, Buffer.from("1".repeat(32), "hex"));
        expect(other.enc.equals(KEYS.enc)).toBe(false);
    });
});
