import { chunk } from "@lib/util";

import { getAllItems } from "@api/files";
import { beginMigration, completeMigration, fillMigration, getDirtyItems, getVaultState } from "@api/merkle";

import { AuthProvider } from "@components/auth/context";

import { buildAttestation } from "./attestation";
import { DirtyItem, MigrationEntry } from "./structures";
import { computeTree } from "./tree";

const FETCH_PAGE_SIZE = 500;
const FILL_PAGE_SIZE = 200;
const MAX_MIGRATION_RETRIES = 3;

/**
 * Migrates the current user's vault to a Merkle tree, computing and filling in hashes for every
 * item that predates it.
 *
 * This is resumable. If it is interrupted, calling it again only handles the items that are still
 * dirty.
 *
 * @param auth the current authentication provider
 * @param onPhaseChange optional callback invoked when the migration phase changes
 * @param onProgress optional callback invoked after every chunk with the current progress
 * @param numRetries how many more times to start over if the vault changed while migrating
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function migrateVaultToMerkle(
    auth: AuthProvider,
    onPhaseChange?: (phase: string) => void,
    onProgress?: (progress: { migratedCount: number; totalCount: number }) => void,
    numRetries: number = MAX_MIGRATION_RETRIES,
): Promise<{ success: boolean; error?: string }> {
    // Get current vault state
    onPhaseChange?.("Getting current vault state...");
    const stateResult = await getVaultState(auth);
    if (!stateResult.success) {
        return { success: false, error: stateResult.error };
    }

    let state = stateResult.state!;
    if (state.merkleStatus === "active") {
        return { success: true };
    }

    // Start the migration, if it wasn't migrating already
    onPhaseChange?.("Starting migration...");
    if (state.merkleStatus === "none") {
        const beginResult = await beginMigration(auth);
        if (!beginResult.success) {
            return { success: false, error: beginResult.error };
        }
        state = beginResult.state!;
    }
    onProgress?.({ migratedCount: state.migratedCount, totalCount: state.totalCount ?? 0 });

    // Get node hashes and content MACs for the entire tree
    onPhaseChange?.("Getting all items...");
    const itemsResult = await getAllItems(auth);
    if (!itemsResult.success) {
        return { success: false, error: itemsResult.error };
    }

    onPhaseChange?.("Computing tree...");
    const { nodeHashes, contentMACs } = await computeTree(auth, state.rootID, itemsResult.items!);
    const rootHash = nodeHashes.get(state.rootID);
    if (!rootHash) {
        return { success: false, error: "Could not compute the vault root's hash" };
    }

    // Find everything that needs filling in
    onPhaseChange?.("Finding dirty items...");
    const dirty: DirtyItem[] = [];
    for (let offset = 0; ; offset += FETCH_PAGE_SIZE) {
        const result = await getDirtyItems(auth, FETCH_PAGE_SIZE, offset);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        dirty.push(...result.items!);
        if (result.items!.length < FETCH_PAGE_SIZE) {
            break;
        }
    }

    // Fill in the dirty items, one chunk at a time
    onPhaseChange?.("Filling in hashes...");
    for (const items of chunk(dirty, FILL_PAGE_SIZE)) {
        const entries: Record<string, MigrationEntry> = {};
        for (const item of items) {
            const nodeHash = nodeHashes.get(item.id);
            if (!nodeHash) {
                return { success: false, error: `Missing computed node hash for item '${item.id}'` };
            }

            let contentMAC: Buffer | null = null;
            if (!item.isFolder) {
                contentMAC = contentMACs.get(item.id) ?? null;
                if (!contentMAC) {
                    return { success: false, error: `Missing computed content MAC for file '${item.id}'` };
                }
            }

            entries[item.id] = { nodeHash, contentMAC };
        }

        const fillResult = await fillMigration(auth, entries);
        if (!fillResult.success) {
            return { success: false, error: fillResult.error };
        }

        state = fillResult.state!;
        onProgress?.({ migratedCount: state.migratedCount, totalCount: state.totalCount ?? 0 });
    }

    // Build the attestation and complete the migration
    onPhaseChange?.("Completing migration...");
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

    // Items were written between fetching the dirty items and completion, so go back for those too
    if (numRetries <= 0) {
        return { success: false, error: "Vault kept changing during migration; try again later" };
    }
    return await migrateVaultToMerkle(auth, onPhaseChange, onProgress, numRetries - 1);
}
