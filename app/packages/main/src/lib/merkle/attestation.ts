import { blake2b } from "@lib/crypto/hashing";
import { bufferEqual, frame, uint64BE } from "@lib/util/buffer";
import { uuidToBytes } from "@lib/util/encoding";

import { MerkleKeys } from "./keys";
import { AttestationBase } from "./structures";

/** The attestation epoch for the Merkle tree */
const ATTESTATION_EPOCH = Buffer.from("Excalibur Merkle v1", "utf-8");

/**
 * @param rootID ID of the tree root being attested (the user's root folder)
 * @param attestation the attestation fields, excluding the tag
 * @returns the bytes that an attestation's tag authenticates
 */
function attestationBytes(rootID: string, attestation: Omit<AttestationBase, "tag">): Buffer {
    return Buffer.concat([
        ATTESTATION_EPOCH,
        frame([
            uuidToBytes(rootID),
            uint64BE(attestation.generation),
            attestation.rootHash,
            attestation.prevRootHash ?? Buffer.alloc(0),
            uint64BE(attestation.timestamp),
        ]),
    ]);
}

/**
 * Builds and tags a new attestation for a vault's Merkle tree.
 *
 * @param keys the Merkle keys to use
 * @param rootID ID of the tree root being attested
 * @param generation the new generation number
 * @param rootHash the new Merkle root hash
 * @param prevRootHash the previous attestation's root hash, or null for generation 1
 * @param timestamp timestamp for the attestation, defaults to the current time
 * @returns the new, tagged attestation
 */
export function buildAttestation(
    keys: MerkleKeys,
    rootID: string,
    generation: number,
    rootHash: Buffer,
    prevRootHash: Buffer | null,
    timestamp: number = Math.floor(Date.now() / 1000),
): AttestationBase {
    const base: Omit<AttestationBase, "tag"> = { generation, rootHash, prevRootHash, timestamp };
    const tag = blake2b(attestationBytes(rootID, base), keys.attestation);
    return { ...base, tag };
}

/**
 * Verifies that an attestation's tag was produced by this vault's attestation key.
 *
 * @param keys the Merkle keys to use
 * @param rootID ID of the tree root the attestation is for
 * @param attestation the attestation to verify
 * @returns whether the attestation's tag is valid
 */
export function verifyAttestationTag(keys: MerkleKeys, rootID: string, attestation: AttestationBase): boolean {
    const expected = buildAttestation(
        keys,
        rootID,
        attestation.generation,
        attestation.rootHash,
        attestation.prevRootHash,
        attestation.timestamp,
    );
    return bufferEqual(expected.tag, attestation.tag);
}
