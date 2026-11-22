import { useEffect, useState } from "react";

import { MerkleStatus, migrateVaultToMerkle, syncMerkleTree } from "@lib/merkle";

import { getVaultState } from "@api/merkle";

import { useAuth } from "@components/auth/context";

import { MerkleProvider, merkleContext } from "./context";

export const ProvideMerkle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const merkle = useProvideMerkle();
    return <merkleContext.Provider value={merkle}>{children}</merkleContext.Provider>;
};

/**
 * Hook to provide the Merkle tree state to the app.
 *
 * Requires the authentication context.
 *
 * @returns an object with the Merkle tree data
 */
function useProvideMerkle(): MerkleProvider {
    // Contexts
    const auth = useAuth();

    // States
    const loggedIn = auth.vaultInfo?.key && auth.getToken();

    const [busy, setBusy] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null); // In ms

    const [rawStatus, setRawStatus] = useState<MerkleStatus | null>(null);
    const status = loggedIn ? rawStatus : null; // Collapses to `null` if user isn't logged in

    // Functions
    async function refreshStatus() {
        const result = await getVaultState(auth);
        if (result.success) {
            setRawStatus(result.state!.merkleStatus);
        }
    }

    async function triggerSync(): Promise<{ success: boolean; error?: string }> {
        setBusy(true);
        try {
            const result = await syncMerkleTree(auth);
            if (result.success) {
                setLastSyncedAt(Date.now());
            }
            return result;
        } finally {
            setBusy(false);
        }
    }

    async function migrate(
        onPhaseChange?: (phase: string) => void,
        onProgress?: (migratedCount: number, totalCount: number) => void,
    ): Promise<{ success: boolean; error?: string }> {
        setBusy(true);
        setRawStatus("migrating");

        try {
            const result = await migrateVaultToMerkle(auth, onPhaseChange, (progress) =>
                onProgress?.(progress.migratedCount, progress.totalCount),
            );
            if (result.success) {
                setRawStatus("active");
                setLastSyncedAt(Date.now());
            } else {
                await refreshStatus();
            }
            return result;
        } finally {
            setBusy(false);
        }
    }

    // Effects
    useEffect(() => {
        // Refresh the Merkle status once the user is fully logged in
        if (!loggedIn) {
            return;
        }

        let cancelled = false;
        getVaultState(auth).then((result) => {
            if (!cancelled && result.success) {
                setRawStatus(result.state!.merkleStatus);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [auth, loggedIn]);

    return {
        status,
        busy,
        lastSyncedAt: lastSyncedAt ? lastSyncedAt / 1e3 : null,
        refreshStatus,
        triggerSync,
        migrate,
    };
}
