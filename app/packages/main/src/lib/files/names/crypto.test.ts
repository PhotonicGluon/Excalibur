import { expect } from "vitest";

import { computeNameTag, decryptName, encryptName } from "./crypto";
import { NameKeys } from "./keys";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const KEYS = new NameKeys(KEY, USER_ID);

const ID_A = "00000000-0000-0000-0000-000000000001";
const ID_B = "00000000-0000-0000-0000-000000000002";
const PARENT_A = "00000000-0000-0000-0000-0000000000a1";
const PARENT_B = "00000000-0000-0000-0000-0000000000b1";

describe("encryptName and decryptName", () => {
    it("should round-trip a name", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "hello.txt");
        expect(await decryptName(KEYS, ID_A, nameEnc)).toBe("hello.txt");
    });

    it("should round-trip names that are well over 255 bytes", async () => {
        const name = "a".repeat(600);
        const nameEnc = await encryptName(KEYS, ID_A, name);
        expect(await decryptName(KEYS, ID_A, nameEnc)).toBe(name);
    });

    it("should round-trip non-ASCII names", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "日本語 🎉.txt");
        expect(await decryptName(KEYS, ID_A, nameEnc)).toBe("日本語 🎉.txt");
    });

    it("should reject a name that is encrypted for a different item", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "hello.txt");
        await expect(decryptName(KEYS, ID_B, nameEnc)).rejects.toThrow();
    });

    it("should reject a name that is encrypted with a different key", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "hello.txt");
        const other = new NameKeys(Buffer.from("2".repeat(24), "utf-8"), USER_ID);
        await expect(decryptName(other, ID_A, nameEnc)).rejects.toThrow();
    });

    it("should normalise names to NFC", async () => {
        const decomposed = "é.txt";
        const nameEnc = await encryptName(KEYS, ID_A, decomposed);
        expect(await decryptName(KEYS, ID_A, nameEnc)).toBe("é.txt");
    });
});

describe("computeNameTag", () => {
    it("should be 32 bytes and deterministic", () => {
        const a = computeNameTag(KEYS, PARENT_A, "file.txt");
        expect(a).toHaveLength(32);
        expect(a).toEqual(computeNameTag(KEYS, PARENT_A, "file.txt"));
    });

    it("should change when the parent changes", () => {
        expect(computeNameTag(KEYS, PARENT_A, "file.txt").equals(computeNameTag(KEYS, PARENT_B, "file.txt"))).toBe(
            false,
        );
    });

    it("should change when the name changes", () => {
        expect(computeNameTag(KEYS, PARENT_A, "a.txt").equals(computeNameTag(KEYS, PARENT_A, "b.txt"))).toBe(false);
    });

    it("should treat equivalent Unicode names as the same", () => {
        expect(computeNameTag(KEYS, PARENT_A, "é")).toEqual(computeNameTag(KEYS, PARENT_A, "é"));
    });
});
