import { createContext, useContext } from "react";

import { SearchResult } from "@lib/files/search";
import { Directory } from "@lib/files/structures";
import { IndexedItem } from "@lib/files/vault-index";

export interface VaultIndexProvider {
    /**
     * Finds the ID of the folder at a path.
     *
     * @param path the path of the folder (`.` specifies the root directory)
     * @returns a promise which resolves to an object with a success boolean and optionally an error
     *      message or the ID of the folder
     */
    resolveFolderID: (path: string) => Promise<{ success: boolean; error?: string; id?: string }>;
    /**
     * Lists the contents of the directory at a path, with the names decrypted.
     *
     * @param path the path to list (`.` specifies the root directory)
     * @returns a promise which resolves to an object with a success boolean and optionally an error
     *      message or the directory object
     */
    listdirByPath: (path: string) => Promise<{ success: boolean; directory?: Directory; error?: string }>;
    /**
     * Gets an item from the index.
     *
     * @param id the ID of the item
     * @returns a promise which resolves to an object with a success boolean and optionally an error
     *      message or the item (`undefined` if there is no such item)
     */
    getItem: (id: string) => Promise<{ success: boolean; error?: string; item?: IndexedItem }>;
    /**
     * Searches the names of the files in the vault.
     *
     * @param query the text to search for
     * @param limit the maximum number of results to return
     * @param threshold the minimum similarity (from 0 to 1) for a file to be returned
     * @returns a promise which resolves to an object with a success boolean and optionally an error
     *      message or the matching files
     */
    search: (
        query: string,
        limit: number,
        threshold: number,
    ) => Promise<{ success: boolean; error?: string; results?: SearchResult[] }>;
    /**
     * Invalidates the current vault index so that the index is reloaded the next time it is needed.
     */
    invalidate: () => void;
}

export const vaultIndexContext = createContext<VaultIndexProvider>(null!);

/**
 * Hook to get the vault index, which maps paths to item IDs and back.
 *
 * @returns the vault index
 */
export function useVaultIndex(): VaultIndexProvider {
    return useContext(vaultIndexContext);
}
