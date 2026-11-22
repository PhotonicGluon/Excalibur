import { expect } from "vitest";

import { computeFolderNodeHash, computeLeafNodeHash } from "./hash";
import { MerkleKeys } from "./keys";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const MERKLE_KEYS = new MerkleKeys(KEY, USER_ID);

const ID_A = "00000000-0000-0000-0000-000000000001";
const ID_B = "00000000-0000-0000-0000-000000000002";
const ID_C = "00000000-0000-0000-0000-000000000003";

const CONTENT_MAC = Buffer.from("1".repeat(64), "hex");

describe("computeLeafNodeHash", () => {
    it("should be deterministic", () => {
        const a = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", CONTENT_MAC);
        const b = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", CONTENT_MAC);
        expect(a).toEqual(b);
    });

    it("should change when the content MAC changes", () => {
        const a = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", CONTENT_MAC);
        const b = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", Buffer.from("2".repeat(64), "hex"));
        expect(a.equals(b)).toBe(false);
    });

    it("should change when the item is renamed", () => {
        const a = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", CONTENT_MAC);
        const b = computeLeafNodeHash(MERKLE_KEYS, ID_A, "renamed.txt", CONTENT_MAC);
        expect(a.equals(b)).toBe(false);
    });

    it("should change when the item's ID changes", () => {
        const a = computeLeafNodeHash(MERKLE_KEYS, ID_A, "file.txt", CONTENT_MAC);
        const b = computeLeafNodeHash(MERKLE_KEYS, ID_B, "file.txt", CONTENT_MAC);
        expect(a.equals(b)).toBe(false);
    });

    it("should not be confusable across a name/content split", () => {
        const a = computeLeafNodeHash(MERKLE_KEYS, ID_A, "ab", Buffer.from("cd", "utf-8"));
        const b = computeLeafNodeHash(MERKLE_KEYS, ID_A, "a", Buffer.from("bcd", "utf-8"));
        expect(a.equals(b)).toBe(false);
    });
});

describe("computeFolderNodeHash", () => {
    const childA = { id: ID_A, nodeHash: Buffer.from("a".repeat(64), "hex") };
    const childB = { id: ID_B, nodeHash: Buffer.from("b".repeat(64), "hex") };

    it("should be deterministic", () => {
        const a = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, childB]);
        const b = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, childB]);
        expect(a).toEqual(b);
    });

    it("should not depend on child order", () => {
        const a = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, childB]);
        const b = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childB, childA]);
        expect(a).toEqual(b);
    });

    it("should change when a child's node hash changes", () => {
        const a = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, childB]);
        const changedChildB = { id: ID_B, nodeHash: Buffer.from("c".repeat(64), "hex") };
        const b = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, changedChildB]);
        expect(a.equals(b)).toBe(false);
    });

    it("should change when the folder is renamed", () => {
        const a = computeFolderNodeHash(MERKLE_KEYS, ID_C, "folder", [childA, childB]);
        const b = computeFolderNodeHash(MERKLE_KEYS, ID_C, "renamed", [childA, childB]);
        expect(a.equals(b)).toBe(false);
    });

    it("should hash two empty folders differently", () => {
        const a = computeFolderNodeHash(MERKLE_KEYS, ID_A, "folder", []);
        const b = computeFolderNodeHash(MERKLE_KEYS, ID_B, "folder", []);
        expect(a.equals(b)).toBe(false);
    });
});
