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
