import ExEF from "@lib/crypto/exef";

import { popFetch } from "@api/fetch";

import { AuthProvider } from "@components/auth/context";

/**
 * An item as sent by the server.
 *
 * Its name is still encrypted (or legacy plaintext).
 */
export interface ItemWire {
    /** Unique identifier for the item */
    id: string;
    /** ID of the folder that contains the item, or `null` for the root folder */
    parent_id: string | null;
    /** Type of the item */
    type: "file" | "directory";
    /** Creation time of the item */
    creation_time: number;
    /** Encrypted name (Base64), or `null` if the item still has a legacy plaintext name */
    name_enc: string | null;
    /** Legacy plaintext name, or `null` if the item has an encrypted name */
    name: string | null;
    /** Size of the file in bytes (files only) */
    size?: number;
    /** Items in the directory (directories only, and only if they were requested) */
    items?: ItemWire[];
}

/**
 * An item as sent by the server.
 *
 * Its name is still encrypted (or legacy plaintext).
 */
export interface ItemWire {
    id: string;
    parent_id: string | null;
    type: "file" | "directory";
    creation_time: number;
    name_enc: string | null;
    name: string | null;
    size?: number;
    items?: ItemWire[];
}

/**
 * Gets all items owned by the current user.
 *
 * @param auth the current authentication provider
 * @param timeout the timeout for the request in seconds
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the items
 */
export async function getAllItems(
    auth: AuthProvider,
    timeout?: number,
): Promise<{ success: boolean; error?: string; items?: ItemWire[] }> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/all`,
        auth.authInfo!.key!,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
            },
        },
        timeout,
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const items = (await new ExEF(auth.authInfo!.key).decryptResponse<ItemWire[]>(response))!;
    return { success: true, items };
}
