import { getMerkleName } from "@lib/files/names";
import { chunk } from "@lib/util";

import { ItemWire } from "@api/files";
import { getContentMACInputs } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

import { ChildNode, computeFolderNodeHash, computeLeafNodeHash } from "./hash";
import { computeContentMAC } from "./mac";

const CONTENT_MAC_INPUTS_CHUNK_SIZE = 200;
const NAME_DECRYPT_CHUNK_SIZE = 500;

/** The result of recomputing every node hash in a vault's Merkle tree from scratch. */
export interface ComputedTree {
    /** Node hash of every item in the tree, keyed by item ID (includes the root) */
    nodeHashes: Map<string, Buffer>;
    /** Content MAC of every file in the tree, keyed by item ID */
    contentMACs: Map<string, Buffer>;
}

/**
 * Recomputes the node hash of every item in a vault's Merkle tree from scratch.
 *
 * Note that the vault root itself is not returned by the item listing; it is identified purely by
 * `rootID` and is treated as an unnamed folder (i.e., a folder with an empty name) for hashing
 * purposes.
 *
 * @param auth the current authentication provider
 * @param rootID ID of the tree's root item
 * @param items every descendant of the tree root
 * @param rootName name of the tree root (as it is bound into its node hash). For the vault root,
 *      provide an empty string
 * @returns the computed node hashes and content MACs for every item, including the tree root
 */
export async function computeTree(
    auth: AuthProvider,
    rootID: string,
    items: ItemWire[],
    rootName: string = "",
): Promise<ComputedTree> {
    const files = items.filter((item) => item.type === "file");

    // Fetch content MAC inputs all files
    const contentMACInputs = new Map<string, Buffer>();
    for (const idChunk of chunk(
        files.map((file) => file.id),
        CONTENT_MAC_INPUTS_CHUNK_SIZE,
    )) {
        console.debug("Fetching content MAC inputs for chunk:", idChunk);
        const result = await getContentMACInputs(auth, idChunk);
        if (!result.success) {
            throw new Error(`Failed to get content MAC inputs: ${result.error}`);
        }
        for (const [id, input] of Object.entries(result.inputs!)) {
            if (input !== null) {
                contentMACInputs.set(id, input);
            }
        }
    }

    // Compute every file's content MAC
    const contentMACs = new Map<string, Buffer>();
    for (const file of files) {
        const input = contentMACInputs.get(file.id);
        if (!input) {
            throw new Error(`Missing content MAC input for file '${file.id}' ('${file.id}')`);
        }
        contentMACs.set(file.id, computeContentMAC(auth.vaultInfo!.merkleKeys, input));
    }

    // Get the name that each item is hashed with
    const names = new Map<string, string>();
    const nameKeys = auth.vaultInfo!.nameKeys;
    for (const itemChunk of chunk(items, NAME_DECRYPT_CHUNK_SIZE)) {
        const chunkNames = await Promise.all(itemChunk.map((item) => getMerkleName(nameKeys, item)));
        itemChunk.forEach((item, i) => names.set(item.id, chunkNames[i]));
    }

    // Group items by their parent's ID
    const childrenByParentID = new Map<string, ItemWire[]>();
    for (const item of items) {
        if (item.parent_id === null) {
            continue;
        }
        if (!childrenByParentID.has(item.parent_id)) {
            childrenByParentID.set(item.parent_id, []);
        }
        childrenByParentID.get(item.parent_id)!.push(item);
    }

    // Recompute node hashes starting from the root
    const nodeHashes = new Map<string, Buffer>();

    function computeNodeHash(id: string, name: string, isFolder: boolean): Buffer {
        let hash: Buffer;
        if (isFolder) {
            const children = childrenByParentID.get(id) ?? [];
            const childNodes: ChildNode[] = children.map((child) => ({
                id: child.id,
                nodeHash: computeNodeHash(child.id, names.get(child.id)!, child.type === "directory"),
            }));
            hash = computeFolderNodeHash(auth.vaultInfo!.merkleKeys, id, name, childNodes);
        } else {
            hash = computeLeafNodeHash(auth.vaultInfo!.merkleKeys, id, name, contentMACs.get(id)!);
        }

        nodeHashes.set(id, hash);
        return hash;
    }

    computeNodeHash(rootID, rootName, true);
    return { nodeHashes, contentMACs: contentMACs };
}
