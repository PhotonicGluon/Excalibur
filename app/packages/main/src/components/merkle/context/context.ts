import { createContext, useContext } from "react";

import { MerkleStatus } from "@lib/merkle";

export interface MerkleProvider {
    /** Current status of the vault's Merkle tree, or null if not yet known */
    status: MerkleStatus | null;
    /** Whether a Merkle operation (i.e., a sync or migration) is in progress */
    busy: boolean;
    /** When the vault was last successfully synced in seconds, or null if never (this session) */
    lastSyncedAt: number | null;
    /** Refreshes the vault's Merkle status from the server */
    refreshStatus: () => Promise<void>;
    /**
     * Triggers a sync of the Merkle tree, bringing its contents up to date with the vault's actual
     * contents.
     *
     * @returns a promise that resolves to an object with a success flag and an optional error
     *      message
     */
    triggerSync: () => Promise<{ success: boolean; error?: string }>;
    /**
     * Migrates the vault to a Merkle tree, reporting progress as it goes.
     *
     * @param onPhaseChange an optional callback to report the current phase of the migration
     * @param onProgress an optional callback to report progress as the migration proceeds
     * @returns a promise that resolves to an object with a success flag and an optional error
     *      message
     */
    migrate: (
        onPhaseChange?: (phase: string) => void,
        onProgress?: (migratedCount: number, totalCount: number) => void,
    ) => Promise<{ success: boolean; error?: string }>;
}

export const merkleContext = createContext<MerkleProvider>(null!);

/**
 * Hook to get the current Merkle tree state.
 *
 * @returns the current Merkle tree state
 */
export function useMerkle(): MerkleProvider {
    return useContext(merkleContext);
}
