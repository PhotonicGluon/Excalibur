import ExEF from "@lib/crypto/exef";
import { Attestation } from "@lib/merkle/structures";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

export interface AttestationBaseWire {
    generation: number;
    root_hash: Buffer;
    prev_root_hash: Buffer | null;
    timestamp: number;
    tag: Buffer;
}

export interface AttestationWire extends AttestationBaseWire {
    root_id: string;
}

/**
 * Gets the latest attestation for the current user's vault.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean, optionally an error
 *      message, and (on success) the latest attestation, or null if the vault has no attestation
 */
export async function getLatestAttestation(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; attestation?: Attestation | null }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/attestation`, auth.authInfo!.key!, {
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

    const attestation = await new ExEF(auth.authInfo!.key!).decryptResponse<AttestationWire | null>(response);
    if (attestation === null) {
        return { success: true, attestation: null };
    }
    return {
        success: true,
        attestation: {
            rootID: attestation.root_id,
            generation: attestation.generation,
            rootHash: attestation.root_hash,
            prevRootHash: attestation.prev_root_hash,
            timestamp: attestation.timestamp,
            tag: attestation.tag,
        },
    };
}
