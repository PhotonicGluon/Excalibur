import { useEffect, useState } from "react";

import { migrateNamesToEncrypted } from "@lib/files/migrate";

import { hasPendingNames } from "@api/files";

import { useAuth } from "@components/auth/context";
import { useVaultIndex } from "@components/files/context";

import { NamesMigrationProvider, namesMigrationContext } from "./context";

export const ProvideNamesMigration: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const namesMigration = useProvideNamesMigration();
    return <namesMigrationContext.Provider value={namesMigration}>{children}</namesMigrationContext.Provider>;
};

/**
 * Hook to provide the state of the migration to encrypted names to the app.
 *
 * Requires the authentication context and the vault index context.
 *
 * @returns an object with the state of the migration
 */
function useProvideNamesMigration(): NamesMigrationProvider {
    // Contexts
    const auth = useAuth();
    const vaultIndex = useVaultIndex();

    // States
    const loggedIn = auth.vaultInfo?.key && auth.getToken();

    const [rawPending, setRawPending] = useState<boolean | null>(null);
    const pending = loggedIn ? rawPending : null;

    // Functions
    async function refreshPending() {
        const result = await hasPendingNames(auth);
        if (result.success) {
            setRawPending(result.pending!);
        }
    }

    async function migrate(
        onProgress?: (migratedCount: number, totalCount: number) => void,
    ): Promise<{ success: boolean; error?: string }> {
        const result = await migrateNamesToEncrypted(auth, (progress) =>
            onProgress?.(progress.migratedCount, progress.totalCount),
        );
        vaultIndex.invalidate(); // Every item's name has changed
        if (result.success) {
            setRawPending(false);
        } else {
            await refreshPending();
        }
        return result;
    }

    // Effects
    useEffect(() => {
        // Check for plaintext names once the user is fully logged in
        if (!loggedIn) {
            return;
        }

        let cancelled = false;
        hasPendingNames(auth).then((result) => {
            if (!cancelled && result.success) {
                setRawPending(result.pending!);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [loggedIn, auth]);

    return { pending, refreshPending, migrate };
}
