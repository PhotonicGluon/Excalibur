import ExEF from "@lib/crypto/exef";
import { MerkleStatus, VaultState } from "@lib/merkle";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

export interface VaultStateWire {
    root_id: string;
    merkle_status: MerkleStatus;
    current_generation: number;
    migrated_count: number;
    total_count: number | null;
}

/**
 * Gets the Merkle tree state for the current user's vault.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the vault state
 */
export async function getVaultState(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; state?: VaultState }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/state`, auth.authInfo!.key!, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const state = (await new ExEF(auth.authInfo!.key!).decryptResponse<VaultStateWire>(response))!;
    return {
        success: true,
        state: {
            rootID: state.root_id,
            merkleStatus: state.merkle_status,
            currentGeneration: state.current_generation,
            migratedCount: state.migrated_count,
            totalCount: state.total_count,
        },
    };
}
