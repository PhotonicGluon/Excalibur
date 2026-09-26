/** Status of a vault's Merkle tree. */
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

/** An item whose Merkle data needs to be (re)computed by the client. */
export interface DirtyItem {
    /** Unique identifier for the filesystem item */
    id: string;
    /** Parent directory ID, or null for the user's root folder */
    parentID: string | null;
    /** Item name */
    name: string;
    /** Whether the item is a folder */
    isFolder: boolean;
    /** Monotonic counter bumped on every mutation to this node */
    version: number;
    /** Whether the client must also submit a content MAC for this item */
    needsContentMAC: boolean;
}

/** The subset of `FSItem` fields relevant to the client when requesting an inclusion proof. */
export interface ProofItem {
    id: string;
    parentID: string | null;
    rootID: string;
    name: string;
    isFolder: boolean;
    contentMAC: Buffer | null;
    nodeHash: Buffer | null;
    version: number;
}

/** One step of an inclusion proof: a parent node and the node hashes of all its children. */
export interface InclusionProofStep {
    /** Unique identifier for the filesystem item */
    id: string;
    /** Name of the filesystem item (it is bound into the item's node hash) */
    name: string;
    /** List of (childID, childNodeHash) pairs */
    children: [string, Buffer | null][];
}

/** An inclusion proof for a single item. */
export interface InclusionProof {
    item: ProofItem;
    steps: InclusionProofStep[];
}

/** A mutation to apply to a Merkle tree. */
export interface Mutation {
    /** Expected generation of the Merkle tree *before* the mutation. */
    expectedGeneration: number;
    /**
     * Mapping of every node that will be modified to its new hash value.
     *
     * This includes every ancestor of the modified nodes.
     */
    nodeHashes: Record<string, Buffer>;
    /**
     * Mapping of every file that is missing a content MAC to its new content MAC.
     *
     * Only files may appear here, and only those that do not already have a content MAC stored on the
     * server (i.e., newly uploaded files).
     */
    contentMACs: Record<string, Buffer>;
    /** New attestation for the Merkle tree. */
    attestation: AttestationBase;
}

/** The Merkle data for a single item, submitted during a migration. */
export interface MigrationEntry {
    /** Keyed MAC of the subtree rooted at this item */
    nodeHash: Buffer;
    /** "Keyed MAC binding the file's AEAD tags to its identity, or null for folders */
    contentMAC: Buffer | null;
}
