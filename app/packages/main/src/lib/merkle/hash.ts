import { blake2b } from "@lib/crypto/hashing";
import { frame } from "@lib/util";
import { uuidToBytes } from "@lib/util/encoding";

import { MerkleKeys } from "./keys";

export interface ChildNode {
    id: string;
    nodeHash: Buffer;
}

/**
 * Binds an item's identity to a payload.
 *
 * @param id item's ID
 * @param name item's name
 * @param payload payload to bind the identity to. This is usually the content MAC (for a file) or
 *      combined children (for a folder)
 * @returns the framed, identity-bound bytes to MAC
 */
function bindIdentity(id: string, name: string, payload: Buffer): Buffer {
    return frame([uuidToBytes(id), Buffer.from(name, "utf-8"), payload]);
}

/**
 * Computes the node hash for a leaf (i.e., file) item.
 *
 * @param keys the Merkle keys to use
 * @param id the file's ID
 * @param name the file's name
 * @param contentMAC the file's content MAC, as computed by {@link computeContentMAC}
 * @returns the file's node hash
 */
export function computeLeafNodeHash(keys: MerkleKeys, id: string, name: string, contentMAC: Buffer): Buffer {
    return blake2b(bindIdentity(id, name, contentMAC), keys.nodeHash);
}

/**
 * Computes the node hash for a folder item, from its children's own node hashes.
 *
 * Note that the children are sorted by their ID before combining, so the result does not depend on
 * the order they were provided in.
 *
 * @param keys the Merkle keys to use
 * @param id the folder's ID
 * @param name the folder's name
 * @param children the folder's direct children along with their node hashes
 * @returns the folder's node hash
 */
export function computeFolderNodeHash(keys: MerkleKeys, id: string, name: string, children: ChildNode[]): Buffer {
    const sortedChildren = children.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const payload = Buffer.concat(sortedChildren.map((child) => frame([uuidToBytes(child.id), child.nodeHash])));
    return blake2b(bindIdentity(id, name, payload), keys.nodeHash);
}
