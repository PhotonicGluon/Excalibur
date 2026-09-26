import { AuthProvider } from "@components/auth/context";

import { syncMerkleTree } from "./sync";

const DEBOUNCE_MS = 2500;

let merkleSyncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a debounced Merkle tree sync, a few seconds after the last call.
 *
 * This coalesces rapid successive file operations (e.g. uploading many files in a row) into a
 * single sync to save network traffic.
 *
 * Does nothing if
 * - the vault has no dirty items; or
 * - the vault hasn't been migrated (or hasn't finished migrating) to a Merkle tree
 *
 * @param auth the current authentication provider
 */
export function scheduleMerkleSync(auth: AuthProvider): void {
    if (merkleSyncTimer) {
        clearTimeout(merkleSyncTimer);
    }

    merkleSyncTimer = setTimeout(() => {
        merkleSyncTimer = null;
        syncMerkleTree(auth).then((result) => {
            if (!result.success) {
                console.warn(`Merkle tree sync failed: ${result.error}`);
            }
        });
    }, DEBOUNCE_MS);
}
