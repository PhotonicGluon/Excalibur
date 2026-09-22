import { FileLike } from "@lib/files/structures";

import { getAllItems } from "@api/files";
import { getContentMACInputs, getInclusionProof, getLatestAttestation, getVaultState } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

import { verifyAttestationTag } from "./attestation";
import { computeFolderNodeHash, computeLeafNodeHash } from "./hash";
import { computeContentMAC } from "./mac";
import { Attestation, VaultState } from "./structures";
import { syncMerkleTree } from "./sync";
import { computeTree } from "./tree";

interface VerifyResult {
    success: boolean;
    error?: string;
    /** Whether the vault's (or item's) data matches the trusted, self-signed attestation */
    verified?: boolean;
    /** Details, set when `verified` is false */
    details?: string;
}

/**
 * Helper function to get the latest data needed for verification.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message, or an the latest state, attestation, and vault items
 */
async function getLatest(auth: AuthProvider): Promise<{
    success: boolean;
    error?: string;
    latest?: { state: VaultState; attestation: Attestation; items: FileLike[] };
}> {
    // Get the latest vault state, ensuring that it has an active Merkle tree
    const stateResult = await getVaultState(auth);
    if (!stateResult.success) {
        return { success: false, error: stateResult.error };
    }
    const state = stateResult.state!;
    if (state.merkleStatus !== "active") {
        return { success: false, error: "Vault has not been migrated to a Merkle tree yet" };
    }

    // Get the latest attestation and verify it
    const attestationResult = await getLatestAttestation(auth);
    if (!attestationResult.success) {
        return { success: false, error: attestationResult.error };
    }
    if (!attestationResult.attestation) {
        return { success: false, error: "Vault has no attestation yet" };
    }
    const attestation = attestationResult.attestation;
    if (!verifyAttestationTag(auth.vaultInfo!.merkleKeys, state.rootID, attestation)) {
        return { success: true, error: "The vault's attestation record itself appears invalid" };
    }

    // Get all items from the server
    const itemsResult = await getAllItems(auth);
    if (!itemsResult.success) {
        return { success: false, error: itemsResult.error! };
    }
    const items = itemsResult.items!;

    return { success: true, latest: { state, attestation, items } };
}

/**
 * Verifies that the current user's entire vault matches its latest trusted attestation.
 *
 * This is done by independently recomputing every item's content MAC and node hash from scratch and
 * comparing the result to the attestation's root hash.
 *
 * Note that this function syncs all of the client's own pending (i.e., unsynced) edits to the
 * server first so that the new edits aren't mistaken for tampering attempts.
 *
 * @param auth the current authentication provider
 * @returns the verification result
 */
export async function verifyVaultIntegrity(auth: AuthProvider): Promise<VerifyResult> {
    // Make sure that the Merkle tree that the server has is up-to-date
    const syncResult = await syncMerkleTree(auth);
    if (!syncResult.success) {
        return { success: false, error: syncResult.error };
    }

    // Get the latest data needed for verification
    const latestResult = await getLatest(auth);
    if (!latestResult.success) {
        return { success: false, error: latestResult.error! };
    }
    if (!latestResult.latest) {
        return { success: false, verified: false, details: latestResult.error! };
    }
    const { state, attestation, items } = latestResult.latest!;

    // Recompute Merkle tree on the client
    const { nodeHashes } = await computeTree(auth, state.rootID, items);
    const computedRoot = nodeHashes.get(state.rootID);
    if (!computedRoot) {
        return { success: false, error: "Could not compute the vault root's hash" };
    }

    // Check root hashes
    const verified = computedRoot.equals(attestation.rootHash);
    return {
        success: true,
        verified,
        details: verified ? undefined : "Recomputed data does not match the vault's trusted root hash",
    };
}

/**
 * Verifies that a single item matches the vault's latest trusted attestation.
 *
 * Recomputes only the target item's own hash from its current content (and, for a folder, its
 * descendants), then walks the server-supplied inclusion proof up to the root -- trusting sibling
 * hashes along the way, as is standard for a Merkle inclusion proof. This is cheaper than
 * {@link verifyVaultIntegrity} since it only needs content MAC inputs for the target's own subtree,
 * not the whole vault.
 *
 * Note that this function syncs all of the client's own pending (i.e., unsynced) edits to the
 * server first so that the new edits aren't mistaken for tampering attempts.
 *
 * @param auth the current authentication provider
 * @param targetID the ID of the item to verify. It is assumed that this is *not* the root ID
 * @returns the verification result
 */
export async function verifyItemIntegrity(auth: AuthProvider, targetID: string): Promise<VerifyResult> {
    const syncResult = await syncMerkleTree(auth);
    if (!syncResult.success) {
        return { success: false, error: syncResult.error };
    }

    // Get the latest data needed for verification
    const latestResult = await getLatest(auth);
    if (!latestResult.success) {
        return { success: false, error: latestResult.error! };
    }
    if (!latestResult.latest) {
        return { success: false, verified: false, details: latestResult.error! };
    }
    const { state, attestation, items } = latestResult.latest!;

    // Check that the item that we want to verify actually exists
    const itemsByID = new Map(items.map((item) => [item.id, item]));
    const target = itemsByID.get(targetID);
    if (!target) {
        return { success: false, error: "Item not found" };
    }

    // Recompute target's own hash, scoped to just its own subtree
    let currentNodeHash: Buffer;
    if (target.type === "file") {
        // Is a file, compute its content MAC to get the node hash
        const inputsResult = await getContentMACInputs(auth, [targetID]);
        if (!inputsResult.success) {
            return { success: false, error: inputsResult.error };
        }
        const input = inputsResult.inputs![targetID];
        if (!input) {
            return { success: false, error: "Could not read the file's content" };
        }

        const contentMAC = computeContentMAC(auth.vaultInfo!.merkleKeys, input);
        currentNodeHash = computeLeafNodeHash(auth.vaultInfo!.merkleKeys, target.id, target.name, contentMAC);
    } else {
        // Is a folder, compute its subtree hash
        const subtreeItems = items.filter(
            (item) =>
                item.id !== target.id &&
                (item.fullpath === target.fullpath || item.fullpath.startsWith(`${target.fullpath}/`)),
        );
        const { nodeHashes } = await computeTree(auth, target.id, subtreeItems, target.name, target.fullpath);
        currentNodeHash = nodeHashes.get(target.id)!;
    }

    // Get the inclusion proof for the target, as produced by the server
    const proofResult = await getInclusionProof(auth, targetID);
    if (!proofResult.success) {
        return { success: false, error: proofResult.error };
    }
    const proof = proofResult.proof!;

    // Walk the inclusion proof up to the root
    let currentID = targetID;
    for (const step of proof.steps) {
        // Find parent of current step
        const parentName = step.id === state.rootID ? "" : itemsByID.get(step.id)?.name;
        if (parentName === undefined) {
            return { success: false, error: `Could not find ancestor '${step.id}'` };
        }

        // Get children (i.e., current node and its siblings)
        const children = [];
        for (const [childID, childHash] of step.children) {
            if (childID === currentID) {
                children.push({ id: childID, nodeHash: currentNodeHash });
                continue;
            }
            if (!childHash) {
                return { success: false, error: "Vault has other unsynced changes; try again shortly" };
            }
            children.push({ id: childID, nodeHash: childHash });
        }

        currentNodeHash = computeFolderNodeHash(auth.vaultInfo!.merkleKeys, step.id, parentName, children);
        currentID = step.id;
    }

    // Check node hashes
    const verified = currentNodeHash.equals(attestation.rootHash);
    return {
        success: true,
        verified,
        details: verified ? undefined : "Recomputed data does not match the vault's trusted root hash.",
    };
}
