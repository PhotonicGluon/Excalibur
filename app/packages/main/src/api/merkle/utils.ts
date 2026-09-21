import {
    Attestation,
    AttestationBase,
    InclusionProof,
    InclusionProofStep,
    Mutation,
    ProofItem,
    VaultState,
} from "@lib/merkle/structures";
import { b64decode, b64encode } from "@lib/util";

import { AttestationBaseWire, AttestationWire } from "./attestation";
import { MutationWire } from "./mutate";
import { InclusionProofStepWire, InclusionProofWire, ProofItemWire } from "./proof";
import { VaultStateWire } from "./state";

/**
 * Converts an attestation to its wire format.
 *
 * @param attestation the attestation to convert
 * @returns the wire format of the attestation
 */
export function attestationToWire(attestation: Attestation): AttestationWire;

/**
 * Converts an attestation base to its wire format.
 *
 * @param attestation the attestation base to convert
 * @returns the wire format of the attestation base
 */
export function attestationToWire(attestation: AttestationBase): AttestationBaseWire;

export function attestationToWire(attestation: Attestation | AttestationBase): AttestationWire | AttestationBaseWire {
    const base = {
        generation: attestation.generation,
        root_hash: b64encode(attestation.rootHash),
        prev_root_hash: attestation.prevRootHash ? b64encode(attestation.prevRootHash) : null,
        timestamp: attestation.timestamp,
        tag: b64encode(attestation.tag),
    };

    if ("rootID" in attestation) {
        return {
            ...base,
            root_id: attestation.rootID,
        } as AttestationWire;
    }
    return base as AttestationBaseWire;
}

/**
 * Converts a wire format attestation to an attestation object.
 *
 * @param wire the wire format attestation to convert
 * @returns the attestation object
 */
export function attestationFromWire(wire: AttestationWire): Attestation;

/**
 * Converts a wire format attestation base to an attestation base object.
 *
 * @param wire the wire format attestation base to convert
 * @returns the attestation base object
 */
export function attestationFromWire(wire: AttestationBaseWire): AttestationBase;

export function attestationFromWire(wire: AttestationWire | AttestationBaseWire): Attestation | AttestationBase {
    const base = {
        generation: wire.generation,
        rootHash: b64decode(wire.root_hash),
        prevRootHash: wire.prev_root_hash ? b64decode(wire.prev_root_hash) : null,
        timestamp: wire.timestamp,
        tag: b64decode(wire.tag),
    };

    if ("root_id" in wire) {
        return {
            ...base,
            rootID: wire.root_id,
        } as Attestation;
    }

    return base as AttestationBase;
}

/**
 * Converts a mutation to its wire format.
 *
 * @param mutation the mutation to convert
 * @returns the wire format of the mutation
 */
export function mutationToWire(mutation: Mutation): MutationWire {
    return {
        expected_generation: mutation.expectedGeneration,
        node_hashes: Object.fromEntries(Object.entries(mutation.nodeHashes).map(([id, hash]) => [id, b64encode(hash)])),
        content_macs: Object.fromEntries(Object.entries(mutation.contentMACs).map(([id, mac]) => [id, b64encode(mac)])),
        attestation: attestationToWire(mutation.attestation),
    };
}

/**
 * Converts a wire format vault state to a vault state object.
 *
 * @param wire the wire format vault state to convert
 * @returns the vault state object
 */
export function vaultStateFromWire(wire: VaultStateWire): VaultState {
    return {
        rootID: wire.root_id,
        merkleStatus: wire.merkle_status,
        currentGeneration: wire.current_generation,
        migratedCount: wire.migrated_count,
        totalCount: wire.total_count,
    };
}

/**
 * Converts a wire format proof item to a proof item object.
 *
 * @param wire the wire format proof item to convert
 * @returns the proof item object
 */
function proofItemFromWire(wire: ProofItemWire): ProofItem {
    return {
        id: wire.id,
        parentID: wire.parent_id,
        rootID: wire.root_id,
        name: wire.name,
        isFolder: wire.is_folder,
        contentMAC: wire.content_mac ? b64decode(wire.content_mac) : null,
        nodeHash: wire.node_hash ? b64decode(wire.node_hash) : null,
        version: wire.version,
    };
}

/**
 * Converts a wire format inclusion proof step to an inclusion proof step object.
 *
 * @param wire the wire format inclusion proof step to convert
 * @returns the inclusion proof step object
 */
function inclusionProofStepFromWire(wire: InclusionProofStepWire): InclusionProofStep {
    return {
        id: wire.id,
        children: wire.children.map(([id, hash]) => [id, hash ? b64decode(hash) : null]),
    };
}

/**
 * Converts a wire format inclusion proof to an inclusion proof object.
 *
 * @param wire the wire format inclusion proof to convert
 * @returns the inclusion proof object
 */
export function inclusionProofFromWire(wire: InclusionProofWire): InclusionProof {
    return {
        item: proofItemFromWire(wire.item),
        steps: wire.steps.map(inclusionProofStepFromWire),
    };
}
