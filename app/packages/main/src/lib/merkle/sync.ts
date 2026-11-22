import { getAllItems } from "@api/files";
import { applyMutation, getDirtyItems, getLatestAttestation, getVaultState } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

import { buildAttestation } from "./attestation";
import { DirtyItem, Mutation } from "./structures";
import { computeTree } from "./tree";

const DIRTY_PAGE_SIZE = 500;
const MAX_SYNC_RETRIES = 3;

/**
 * Fetches every dirty item for the current user's vault, paging as needed.
 *
 * @param auth the current authentication provider
 * @returns every dirty item
 * @throws {Error} if any fetch operation fails
 */
async function fetchAllDirtyItems(auth: AuthProvider): Promise<DirtyItem[]> {
    const items: DirtyItem[] = [];

    let offset = 0;
    let currNumItems = DIRTY_PAGE_SIZE; // Initialize to enter loop
    while (currNumItems >= DIRTY_PAGE_SIZE) {
        const result = await getDirtyItems(auth, DIRTY_PAGE_SIZE, offset);
        if (!result.success) {
            throw new Error(`Failed to get dirty items: ${result.error}`);
        }
        items.push(...result.items!);
        currNumItems = result.items!.length;
        offset += DIRTY_PAGE_SIZE;
    }

    return items;
}

/**
 * Brings the current user's vault's Merkle tree back up to date with its actual contents by
 * recomputing hashes for every dirty item and submitting them as a new, attested generation.
 *
 * Does nothing if
 * - the vault has no dirty items; or
 * - the vault hasn't been migrated (or hasn't finished migrating) to a Merkle tree
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message, and a boolean indicating whether anything was synced
 */
export async function syncMerkleTree(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; synced: boolean }> {
    for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
        // Make sure that the vault has an active Merkle tree
        const stateResult = await getVaultState(auth);
        if (!stateResult.success) {
            return { success: false, error: stateResult.error, synced: false };
        }
        const state = stateResult.state!;
        if (state.merkleStatus !== "active") {
            return { success: true, synced: false };
        }

        // Fetch all dirty items
        const dirtyItems = await fetchAllDirtyItems(auth);
        if (dirtyItems.length === 0) {
            return { success: true, synced: false };
        }

        // Get the vault's latest attestation
        const attestationResult = await getLatestAttestation(auth);
        if (!attestationResult.success) {
            return { success: false, error: attestationResult.error, synced: false };
        }
        const prevAttestation = attestationResult.attestation ? attestationResult.attestation : null;

        // Get all items in the vault
        const itemsResult = await getAllItems(auth);
        if (!itemsResult.success) {
            return { success: false, error: itemsResult.error, synced: false };
        }

        // Compute the Merkle tree for the dirty items
        const { nodeHashes: allNodeHashes, contentMACs: allContentMACs } = await computeTree(
            auth,
            state.rootID,
            itemsResult.items!,
        );

        const nodeHashes: Record<string, Buffer> = {};
        for (const item of dirtyItems) {
            const hash = allNodeHashes.get(item.id);
            if (!hash) {
                throw new Error(`Missing computed node hash for dirty item '${item.id}'`);
            }
            nodeHashes[item.id] = hash;
        }

        const contentMACs: Record<string, Buffer> = {};
        for (const item of dirtyItems.filter((i) => i.needsContentMAC)) {
            const mac = allContentMACs.get(item.id);
            if (!mac) {
                throw new Error(`Missing computed content MAC for dirty item '${item.id}'`);
            }
            contentMACs[item.id] = mac;
        }

        // Build new attestation
        const rootHash = allNodeHashes.get(state.rootID)!;
        const newAttestation = buildAttestation(
            auth.vaultInfo!.merkleKeys,
            state.rootID,
            state.currentGeneration + 1,
            rootHash,
            prevAttestation?.rootHash ?? null,
        );

        // Apply the mutation
        const mutation: Mutation = {
            expectedGeneration: state.currentGeneration,
            nodeHashes,
            contentMACs,
            attestation: newAttestation,
        };

        const mutateResult = await applyMutation(auth, mutation);
        if (mutateResult.success) {
            return { success: true, synced: true };
        }
        if (!mutateResult.conflict) {
            return { success: false, error: mutateResult.error, synced: false };
        }

        // If reached here, that means that there was a conflict (i.e., the vault changed, which
        // could happen if another device synced). In this case, we need to loop around to refetch
        // state/dirty/attestation and retry with a rebuilt mutation
    }

    return { success: false, error: "Vault kept changing during sync; try again later", synced: false };
}
