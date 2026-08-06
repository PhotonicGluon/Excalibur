import { blake2b } from "@noble/hashes/blake2.js";

import { MerkleKeys } from "./keys";

/**
 * Computes the content MAC for a given input using the provided Merkle keys.
 *
 * @param merkleKeys the Merkle keys to use for the computation
 * @param input the input to compute the MAC for
 * @returns the computed MAC
 */
export function computeContentMAC(merkleKeys: MerkleKeys, input: Buffer): Buffer {
    const hash = blake2b.create({ dkLen: 32, key: merkleKeys.content });
    hash.update(input);
    return Buffer.from(hash.digest());
}
