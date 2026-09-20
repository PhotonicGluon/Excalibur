/** Status of a vault's Merkle tree, mirroring the server's `MerkleStatus` enum. */
export type MerkleStatus = "none" | "migrating" | "active";

/** Contains the state of a user's vault. */
export interface VaultState {
    /** ID of the user's root filesystem item */
    rootID: string;
    /** Status of the Merkle tree for the vault */
    merkleStatus: MerkleStatus;
    /** Current generation of the vault */
    currentGeneration: number;
    /** Number of items that have been migrated to the new generation */
    migratedCount: number;
    /** Total number of items in the vault, or null if not yet computed */
    totalCount: number | null;
}

/** An item whose Merkle data needs to be (re)computed by the client, from `GET /merkle/dirty`. */
export interface DirtyItem {
    id: string;
    parent_id: string | null;
    name: string;
    is_folder: boolean;
    version: number;
    needs_content_mac: boolean;
}

/**
 * An attestation of a user's vault state without the tree root that it attests (tree root is
 * determined by server).
 */
export interface AttestationBase {
    /** Generation of the vault that this attestation is for */
    generation: number;
    /** Merkle root hash of the tree */
    rootHash: Buffer;
    /** Previous root hash, or null for the first generation */
    prevRootHash: Buffer | null;
    /** Timestamp when this attestation was generated */
    timestamp: number;
    /** Tag authenticating this attestation */
    tag: Buffer;
}

/** A stored attestation, as returned by the server (includes the root ID). */
export interface Attestation extends AttestationBase {
    rootID: string;
}

/** The subset of `FSItem` fields relevant to the client when requesting an inclusion proof. */
export interface ProofItem {
    id: string;
    parentID: string | null;
    rootID: string;
    name: string;
    isFolder: boolean;
    contentMAC: string | null;
    nodeHash: string | null;
    version: number;
}

/** One step of an inclusion proof: a parent node and the node hashes of all its children. */
export interface InclusionProofStep {
    /** Unique identifier for the filesystem item */
    id: string;
    /** List of (child_id, child_node_hash) pairs */
    children: [string, string | null][];
}

/** An inclusion proof for a single item. */
export interface InclusionProof {
    item: ProofItem;
    steps: InclusionProofStep[];
}

/** An attestation of a vault's Merkle tree state, without the root ID (submitted to the server). */
