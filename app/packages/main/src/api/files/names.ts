import ExEF from "@lib/crypto/exef";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/** An item that still has a plaintext name, which needs to be replaced by an encrypted one. */
export interface PendingName {
    /** Unique identifier for the item */
    id: string;
    /** ID of the folder that contains the item */
    parentID: string;
    /** Whether the item is a folder */
    isFolder: boolean;
    /** The item's legacy plaintext name */
    name: string;
}

interface PendingNameWire {
    id: string;
    parent_id: string;
    is_folder: boolean;
    name: string;
}

/** An encrypted name, as sent to the server. Both fields are in Base64. */
export interface EncryptedNameWire {
    name_enc: string;
    name_tag: string;
}

/**
 * Checks whether the current user has any items that still have a plaintext name.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean, optionally an error
 *      message, and (on success) whether any plaintext names remain
 */
export async function hasPendingNames(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; pending?: boolean }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/names/pending`, auth.authInfo!.key!, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            return { success: true, pending: true };
        case 204:
            return { success: true, pending: false };
        case 401:
            return { success: false, error: "Unauthorized" };
        default:
            return { success: false, error: "Unknown error" };
    }
}

/**
 * Gets a page of the items that still have a plaintext name.
 *
 * The root folder is never included, and the items are ordered by ID.
 *
 * @param auth the current authentication provider
 * @param limit maximum number of items to return, or all of them if omitted
 * @param offset number of items to skip
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the pending items
 */
export async function getPendingNames(
    auth: AuthProvider,
    limit?: number,
    offset: number = 0,
): Promise<{ success: boolean; error?: string; items?: PendingName[] }> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== 0) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";

    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/names/pending${query}`, auth.authInfo!.key!, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const items = (await new ExEF(auth.authInfo!.key!).decryptResponse<PendingNameWire[]>(response))!;
    return {
        success: true,
        items: items.map((item) => ({
            id: item.id,
            parentID: item.parent_id,
            isFolder: item.is_folder,
            name: item.name,
        })),
    };
}

/**
 * Submits a chunk of encrypted names, replacing the plaintext names of those items.
 *
 * This is resumable:
 * - chunks may be submitted in any order; and
 * - re-submitting a chunk simply overwrites the names that were previously stored for those items.
 *
 * @param auth the current authentication provider
 * @param names mapping of item IDs to their encrypted names
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function fillNames(
    auth: AuthProvider,
    names: Record<string, EncryptedNameWire>,
): Promise<{ success: boolean; error?: string }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/files/names/fill`, auth.authInfo!.key!, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${auth.getToken()}`,
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Content-Type": "application/json",
        },
        // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
        body: await new ExEF(auth.authInfo!.key!, { version: 4 }).encrypt(Buffer.from(JSON.stringify(names), "utf-8")),
    });
    switch (response.status) {
        case 200:
            return { success: true };
        case 401:
            return { success: false, error: "Unauthorized" };
        case 409:
            return { success: false, error: "An item is not in this vault, or a name already exists" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }
}
