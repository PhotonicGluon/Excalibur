import ExEF from "@lib/crypto/exef";
import { DirtyItem } from "@lib/merkle/structures";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

import { dirtyItemFromWire } from "./utils";

export interface DirtyItemWire {
    id: string;
    parent_id: string | null;
    name: string;
    is_folder: boolean;
    version: number;
    needs_content_mac: boolean;
}

/**
 * Checks whether the current user's vault has any dirty items.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean, optionally an error
 *      message, and (on success) whether any dirty items exist
 */
export async function hasDirtyItems(
    auth: AuthProvider,
): Promise<{ success: boolean; error?: string; dirty?: boolean }> {
    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/dirty`, auth.authInfo!.key!, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.getToken()}` },
    });
    switch (response.status) {
        case 200:
            return { success: true, dirty: true };
        case 204:
            return { success: true, dirty: false };
        case 401:
            return { success: false, error: "Unauthorized" };
        default:
            return { success: false, error: "Unknown error" };
    }
}

/**
 * Gets a page of dirty items for the current user.
 *
 * @param auth the current authentication provider
 * @param limit maximum number of items to return, or all of them if omitted
 * @param offset number of items to skip
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the dirty items
 */
export async function getDirtyItems(
    auth: AuthProvider,
    limit?: number,
    offset: number = 0,
): Promise<{ success: boolean; error?: string; items?: DirtyItem[] }> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== 0) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";

    const response = await popFetch(`${auth.serverInfo!.apiURL}/merkle/dirty${query}`, auth.authInfo!.key!, {
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

    const items = (await new ExEF(auth.authInfo!.key!).decryptResponse<DirtyItemWire[]>(response))!.map(
        dirtyItemFromWire,
    );
    return { success: true, items };
}
