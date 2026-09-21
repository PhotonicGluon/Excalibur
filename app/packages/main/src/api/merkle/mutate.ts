import ExEF from "@lib/crypto/exef";
import { Attestation, Mutation } from "@lib/merkle/structures";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

import { AttestationBaseWire, AttestationWire } from "./attestation";

interface MutationWire {
    expected_generation: number;
    node_hashes: Record<string, string>;
    content_macs: Record<string, string>;
    attestation: AttestationBaseWire;
}

/**
 * Applies a mutation to the Merkle tree.
 *
 * On a conflict, the caller should refetch the vault state and dirty items, rebuild the mutation,
 * and retry.
 *
 * @param auth the current authentication provider
 * @param mutation the mutation to apply
 * @returns a promise which resolves to an object with a success boolean, optionally an error
 *      message, whether the failure was a conflict (so the caller knows to retry), and (on success)
 *      the new attestation
 */
export async function applyMutation(
    auth: AuthProvider,
    mutation: Mutation,
): Promise<{ success: boolean; error?: string; conflict?: boolean; attestation?: Attestation }> {
    const mutationWire: MutationWire = {
        expected_generation: mutation.expectedGeneration,
        node_hashes: mutation.nodeHashes,
        content_macs: mutation.contentMACs,
        attestation: {
            generation: mutation.attestation.generation,
            root_hash: mutation.attestation.rootHash,
            prev_root_hash: mutation.attestation.prevRootHash,
            timestamp: mutation.attestation.timestamp,
            tag: mutation.attestation.tag,
        },
    };

    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/mutate`, auth.authInfo!.key!, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify(mutationWire), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "Mutation is invalid", conflict: true };
        default:
            return { success: false, error: "Unknown error" };
    }

    const attestation = (await new ExEF(auth.authInfo!.key!).decryptResponse<AttestationWire>(response))!;
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
