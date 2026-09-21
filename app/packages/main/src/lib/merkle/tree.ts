import { chunk } from "cypress/types/lodash";

import { FileLike } from "@lib/files/structures";
import { b64decode, getParent } from "@lib/util";

import { getContentMACInputs } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

import { ChildNode, computeFolderNodeHash, computeLeafNodeHash } from "./hash";
import { MerkleKeys } from "./keys";
import { computeContentMAC } from "./mac";

const CONTENT_MAC_INPUTS_CHUNK_SIZE = 200;

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
 * @param keys the Merkle keys to use
 * @param rootID ID of the tree's root item
 * @param items every descendant of the tree root
 * @param rootName name of the tree root. For the vault root, provide an empty string
 * @param rootFullpath fullpath to the tree root. For the vault root, provide an empty string
 * @returns the computed node hashes and content MACs for every item, including the tree root
 */
export async function computeTree(
    auth: AuthProvider,
    keys: MerkleKeys,
    rootID: string,
    items: FileLike[],
    rootName: string = "",
    rootFullpath: string = "",
): Promise<ComputedTree> {
    const files = items.filter((item) => item.type === "file");

    // Fetch content MAC inputs all files
    const contentMACInputs = new Map<string, Buffer>();
    for (const idChunk of chunk(
        files.map((file) => file.id),
        CONTENT_MAC_INPUTS_CHUNK_SIZE,
    )) {
        const result = await getContentMACInputs(auth, idChunk);
        if (!result.success) {
            throw new Error(`Failed to get content MAC inputs: ${result.error}`);
        }
        for (const [id, input] of Object.entries(result.inputs!)) {
            if (input !== null) {
                contentMACInputs.set(id, b64decode(input));
            }
        }
    }

    // Compute every file's content MAC
    const contentMACs = new Map<string, Buffer>();
    for (const file of files) {
        const input = contentMACInputs.get(file.id);
        if (!input) {
            throw new Error(`Missing content MAC input for file '${file.id}' ('${file.fullpath}')`);
        }
        contentMACs.set(file.id, computeContentMAC(keys, input));
    }

    // Group items by their parent's fullpath
    const childrenByParentPath = new Map<string, FileLike[]>();
    for (const item of items) {
        const parentPath = getParent(item.fullpath); // TODO: Check this
        if (!childrenByParentPath.has(parentPath)) {
            childrenByParentPath.set(parentPath, []);
        }
        childrenByParentPath.get(parentPath)!.push(item);
    }

    // Recompute node hashes starting from the root
    const nodeHashes = new Map<string, Buffer>();

    function computeNodeHash(id: string, name: string, fullpath: string, isFolder: boolean): Buffer {
        let hash: Buffer;
        if (isFolder) {
            const children = childrenByParentPath.get(fullpath) ?? [];
            const childNodes: ChildNode[] = children.map((child) => ({
                id: child.id,
                nodeHash: computeNodeHash(child.id, child.name, child.fullpath, child.type === "directory"),
            }));
            hash = computeFolderNodeHash(keys, id, name, childNodes);
        } else {
            hash = computeLeafNodeHash(keys, id, name, contentMACs.get(id)!);
        }

        nodeHashes.set(id, hash);
        return hash;
    }

    computeNodeHash(rootID, rootName, rootFullpath, true);
    return { nodeHashes, contentMACs: contentMACs };
}
