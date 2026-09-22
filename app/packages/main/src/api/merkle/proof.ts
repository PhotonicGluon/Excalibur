import ExEF from "@lib/crypto/exef";
import { InclusionProof } from "@lib/merkle";
import { IS_DEV, b64encodeURLSafe } from "@lib/util";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

import { inclusionProofFromWire } from "./utils";

export interface ProofItemWire {
    id: string;
    parent_id: string | null;
    root_id: string;
    name: string;
    is_folder: boolean;
    content_mac: string | null;
    node_hash: string | null;
    version: number;
}

export interface InclusionProofStepWire {
    id: string;
    children: [string, string | null][];
}

export interface InclusionProofWire {
    item: ProofItemWire;
    steps: InclusionProofStepWire[];
}

/**
 * Gets the inclusion proof for a single item in the Merkle tree.
 *
 * @param auth the current authentication provider
 * @param itemID the ID of the item to get the inclusion proof for
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the inclusion proof
 */
export async function getInclusionProof(
    auth: AuthProvider,
    itemID: string,
): Promise<{ success: boolean; error?: string; proof?: InclusionProof }> {
    let additionalHeaders = {};
    if (!IS_DEV) {
        const encryptedItemID = await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(
            Buffer.from(itemID, "utf-8"),
        );
        itemID = b64encodeURLSafe(encryptedItemID);
        additionalHeaders = { "X-Encrypted": "true" };
    }

    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/proof/${itemID}`, auth.authInfo!.key!, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.getToken()}`, ...additionalHeaders },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Item not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const proof = inclusionProofFromWire(
        (await new ExEF(auth.authInfo!.key!).decryptResponse<InclusionProofWire>(response))!,
    );
    return { success: true, proof };
}
