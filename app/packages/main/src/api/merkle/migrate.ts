import ExEF from "@lib/crypto/exef";
import { Attestation, AttestationBase, MigrationEntry, VaultState } from "@lib/merkle/structures";
import { b64encode } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

import { AttestationWire } from "./attestation";
import { VaultStateWire } from "./state";
import { attestationFromWire, attestationToWire, vaultStateFromWire } from "./utils";

/**
 * Begins migrating the current user's vault to a Merkle tree.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the vault state
 */
export async function beginMigration(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; state?: VaultState }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/migrate`, auth.authInfo!.key!, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "Vault already has a Merkle tree" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const state = (await new ExEF(auth.authInfo!.key!).decryptResponse<VaultStateWire>(response))!;
    return {
        success: true,
        state: vaultStateFromWire(state),
    };
}

interface MigrationEntryWire {
    node_hash: string;
    content_mac: string | null;
}

/**
 * Submits a chunk of Merkle data for an in-progress migration.
 *
 * This is resumable:
 * - chunks may be submitted in any order; and
 * - re-submitting a chunk simply overwrites the data that was previously stored for those items.
 *
 * @param auth the current authentication provider
 * @param entries mapping of item IDs to their Merkle data
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the updated vault state
 */
export async function fillMigration(
    auth: AuthProvider,
    entries: Record<string, MigrationEntry>,
): Promise<{ success: boolean; error?: string; state?: VaultState }> {
    const entriesWire: Record<string, MigrationEntryWire> = Object.fromEntries(
        Object.entries(entries).map(([id, entry]) => [
            id,
            {
                node_hash: entry.nodeHash,
                content_mac: entry.contentMAC ? b64encode(entry.contentMAC) : null,
            },
        ]),
    );

    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/migrate/fill`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify(entriesWire), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "Vault is not migrating, or the chunk is invalid" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const state = vaultStateFromWire((await new ExEF(auth.authInfo!.key!).decryptResponse<VaultStateWire>(response))!);
    return { success: true, state };
}

/**
 * Completes an in-progress migration, moving the vault to the `active` status.
 *
 * Every item in the vault must have its Merkle data filled in (via {@link fillMigration}) before
 * this is called.
 *
 * @param auth the current authentication provider
 * @param attestation the generation-1 attestation for the vault
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the stored attestation
 */
export async function completeMigration(
    auth: AuthProvider,
    attestation: AttestationBase,
): Promise<{ success: boolean; error?: string; conflict?: boolean; attestation?: Attestation }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/migrate/complete`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(JSON.stringify(attestationToWire(attestation)), "utf-8"),
        ),
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "Vault is not migrating, or the attestation is invalid", conflict: true };
        default:
            return { success: false, error: "Unknown error" };
    }

    const newAttestation = attestationFromWire(
        (await new ExEF(auth.authInfo!.key!).decryptResponse<AttestationWire>(response))!,
    );
    return { success: true, attestation: newAttestation };
}
