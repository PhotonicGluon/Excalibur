import ExEF from "@lib/crypto/exef";
import { Attestation } from "@lib/merkle";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

import { attestationFromWire } from "./utils";

export interface AttestationBaseWire {
    generation: number;
    root_hash: string;
    prev_root_hash: string | null;
    timestamp: number;
    tag: string;
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

    const attestationWire = await new ExEF(auth.authInfo!.key!).decryptResponse<AttestationWire | null>(response);
    if (attestationWire === null) {
        return { success: true, attestation: null };
    }
    return {
        success: true,
        attestation: attestationFromWire(attestationWire),
    };
}
