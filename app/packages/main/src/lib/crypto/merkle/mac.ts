import { blake2b } from "@noble/hashes/blake2.js";

import { ExEFv3, ExEFv4, HeaderV4, identifyVersion } from "@lib/crypto/exef";

import { MerkleKeys } from "./keys";

/**
 * Get the content MAC input for the given ExEF data.
 *
 * @param exefData the ExEF data to get the content MAC input for
 * @throws {Error} if the ExEF version is not supported
 * @returns the content MAC input for the given ExEF data
 */
export function getContentMACInput(exefData: Buffer): Buffer {
    const version = identifyVersion(exefData);

    if (version === 3) {
        return Buffer.concat([exefData.subarray(0, ExEFv3.headerSize), exefData.subarray(-ExEFv3.footerSize)]);
    }
    if (version === 4) {
        const header = HeaderV4.fromBuffer(exefData.subarray(0, ExEFv4.headerSize));
        const chunkCount = header.chunkCount;

        const macInput = Buffer.alloc(16 * chunkCount);
        for (let i = 0; i < chunkCount; i++) {
            if (i === chunkCount - 1) {
                // Last chunk has the tag right at the end of the data
                macInput.set(exefData.subarray(-16), i * 16);
            } else {
                // Other chunks have the tag at the end of the chunk
                const offset = ExEFv4.headerSize + i * (header.chunkSize + 16) + header.chunkSize;
                macInput.set(exefData.subarray(offset, offset + 16), i * 16);
            }
        }
        return macInput;
    }

    throw new Error(`Unsupported ExEF version: ${version}`);
}

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
