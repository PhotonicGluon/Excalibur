import { buildAttestation } from "@lib/merkle/attestation";
import { MigrationEntry, VaultState } from "@lib/merkle/structures";
import { computeTree } from "@lib/merkle/tree";

import { getAllItems } from "@api/files";
import { beginMigration, completeMigration, fillMigration, getDirtyItems, getVaultState } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

const FILL_PAGE_SIZE = 200;
/**
 * Safety cap on the number of fill passes, in case the vault is being written to faster than it can
 * be migrated. Each pass fills at least `FILL_PAGE_SIZE` items, so this bounds the total work.
 */
const MAX_FILL_PASSES = 500;
const MAX_MIGRATION_RETRIES = 3;

/**
 * Migrates the current user's vault to a Merkle tree, computing and filling in hashes for every
 * item that predates it.
 *
 * @param auth the current authentication provider
 * @param onProgress optional callback invoked after every fill pass with the current progress
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function migrateVaultToMerkle(
    auth: AuthProvider,
    onProgress?: (progress: { migratedCount: number; totalCount: number }) => void,
): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 0; attempt < MAX_MIGRATION_RETRIES; attempt++) {
        // Get current vault state
        const stateResult = await getVaultState(auth);
        if (!stateResult.success) {
            return { success: false, error: stateResult.error };
        }

        let state = stateResult.state!;
        if (state.merkleStatus === "active") {
            return { success: true };
        }

        // Start the migration, if it wasn't migrating already
        if (state.merkleStatus === "none") {
            const beginResult = await beginMigration(auth);
            if (!beginResult.success) {
                return { success: false, error: beginResult.error };
            }
            state = beginResult.state!;
        }
        onProgress?.({ migratedCount: state.migratedCount, totalCount: state.totalCount ?? 0 });

        // Run fill passes until the migration is complete
        const fillResult = await runFillPasses(auth, state, onProgress);
        if (!fillResult.success) {
            return fillResult;
        }
        state = fillResult.state!;

        // Compute the final root hash and complete the migration
        const itemsResult = await getAllItems(auth);
        if (!itemsResult.success) {
            return { success: false, error: itemsResult.error };
        }
        const { nodeHashes } = await computeTree(auth, state.rootID, itemsResult.items!);
        const rootHash = nodeHashes.get(state.rootID);
        if (!rootHash) {
            return { success: false, error: "Could not compute the vault root's hash" };
        }

        // Build the attestation and complete the migration
        const attestation = buildAttestation(
            auth.vaultInfo!.merkleKeys,
            state.rootID,
            1, // First generation of the Merkle tree
            rootHash,
            null,
        );
        const completeResult = await completeMigration(auth, attestation);
        if (completeResult.success) {
            return { success: true };
        }
        if (!completeResult.conflict) {
            return { success: false, error: completeResult.error };
        }

        // If reached here, that means that there was a conflict (i.e., items were written between
        // the last fill pass and completion). In this case, we need to loop around to fill in those
        // items too
    }

    return { success: false, error: "Vault kept changing during migration; try again later" };
}

/**
 * Repeatedly fills in dirty items until none remain, refreshing the vault state after each pass.
 *
 * @param auth the current authentication provider
 * @param state the vault's current state
 * @param onProgress optional progress callback
 * @returns the outcome, including the final vault state on success
 */
async function runFillPasses(
    auth: AuthProvider,
    state: VaultState,
    onProgress?: (progress: { migratedCount: number; totalCount: number }) => void,
): Promise<{ success: boolean; error?: string; state?: VaultState }> {
    for (let pass = 0; pass < MAX_FILL_PASSES; pass++) {
        // Check if we migrated everything
        if (state.migratedCount >= (state.totalCount ?? 0)) {
            return { success: true, state };
        }

        // Check if any dirty items remain
        const dirtyResult = await getDirtyItems(auth, FILL_PAGE_SIZE);
        if (!dirtyResult.success) {
            return { success: false, error: dirtyResult.error };
        }
        const dirtyItems = dirtyResult.items!;
        if (dirtyItems.length === 0) {
            return { success: true, state };
        }

        // Recompute node hashes and content MACs for the entire tree
        const itemsResult = await getAllItems(auth);
        if (!itemsResult.success) {
            return { success: false, error: itemsResult.error };
        }
        const { nodeHashes, contentMACs } = await computeTree(auth, state.rootID, itemsResult.items!);

        // Create migration entries for dirty items
        const entries: Record<string, MigrationEntry> = {};
        for (const item of dirtyItems) {
            const hash = nodeHashes.get(item.id);
            if (!hash) {
                throw new Error(`Missing computed node hash for item '${item.id}'`);
            }

            let contentMAC: Buffer | null = null;
            if (!item.isFolder) {
                contentMAC = contentMACs.get(item.id) ?? null;
                if (!contentMAC) {
                    throw new Error(`Missing computed content MAC for file '${item.id}'`);
                }
            }

            entries[item.id] = { nodeHash: hash, contentMAC: contentMAC };
        }

        // Fill in migration data
        const fillResult = await fillMigration(auth, entries);
        if (!fillResult.success) {
            return { success: false, error: fillResult.error };
        }

        state = fillResult.state!;
        onProgress?.({ migratedCount: state.migratedCount, totalCount: state.totalCount ?? 0 });
    }

    return { success: false, error: "Vault is being written to faster than it can be migrated; try again later" };
}
