import { createContext, useContext } from "react";

export interface NamesMigrationProvider {
    /** Whether any names still need to be encrypted, or `null` if not yet known */
    pending: boolean | null;
    /** Checks with the server whether any names still need to be encrypted */
    refreshPending: () => Promise<void>;
    /**
     * Encrypts the names that are still in plaintext, reporting progress as it goes.
     *
     * @param onProgress an optional callback to report progress as the migration proceeds
     * @returns a promise that resolves to an object with a success flag and an optional error
     *      message
     */
    migrate: (
        onProgress?: (migratedCount: number, totalCount: number) => void,
    ) => Promise<{ success: boolean; error?: string }>;
}

export const namesMigrationContext = createContext<NamesMigrationProvider>(null!);

/**
 * Hook to get the state of the migration to encrypted names.
 *
 * @returns the state of the migration to encrypted names
 */
export function useNamesMigration(): NamesMigrationProvider {
    return useContext(namesMigrationContext);
}
