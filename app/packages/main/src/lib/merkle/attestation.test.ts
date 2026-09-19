import { expect } from "vitest";

import { buildAttestation, verifyAttestationTag } from "./attestation";
import { MerkleKeys } from "./keys";
import { AttestationBase } from "./structures";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const MERKLE_KEYS = new MerkleKeys(KEY, USER_ID);

const ROOT_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_ROOT_ID = "00000000-0000-0000-0000-000000000002";
const ROOT_HASH = Buffer.from("a".repeat(64), "hex");
const TIMESTAMP = 1000000000;

describe("buildAttestation", () => {
    it("should be deterministic", () => {
        const a = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        const b = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        expect(a).toEqual(b);
    });

    it("should produce a tag that changes with generation", () => {
        const a = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        const b = buildAttestation(MERKLE_KEYS, ROOT_ID, 2, ROOT_HASH, ROOT_HASH, TIMESTAMP);
        expect(a.tag.equals(b.tag)).toBe(false);
    });

    it("should produce a tag that changes with the root ID", () => {
        const a = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        const b = buildAttestation(MERKLE_KEYS, OTHER_ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        expect(a.tag.equals(b.tag)).toBe(false);
    });
});

describe("verifyAttestationTag", () => {
    it("should accept a genuinely produced attestation", () => {
        const attestation = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        expect(verifyAttestationTag(MERKLE_KEYS, ROOT_ID, attestation)).toBe(true);
    });

    it("should reject an attestation tagged for a different root", () => {
        const attestation = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        expect(verifyAttestationTag(MERKLE_KEYS, OTHER_ROOT_ID, attestation)).toBe(false);
    });

    it("should reject an attestation whose fields were tampered with after tagging", () => {
        const attestation = buildAttestation(MERKLE_KEYS, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        const tampered: AttestationBase = { ...attestation, rootHash: Buffer.from("b".repeat(64), "hex") };
        expect(verifyAttestationTag(MERKLE_KEYS, ROOT_ID, tampered)).toBe(false);
    });

    it("should reject a tag produced with a different vault's keys", () => {
        const otherKeys = new MerkleKeys(Buffer.from("2".repeat(24), "utf-8"), USER_ID);
        const attestation = buildAttestation(otherKeys, ROOT_ID, 1, ROOT_HASH, null, TIMESTAMP);
        expect(verifyAttestationTag(MERKLE_KEYS, ROOT_ID, attestation)).toBe(false);
    });
});
