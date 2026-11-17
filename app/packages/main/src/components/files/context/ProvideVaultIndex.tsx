import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { Directory } from "@lib/files/structures";
import { NameCache, VaultIndex, decryptItems } from "@lib/files/vault-index";

import { getAllItems, listdir } from "@api/files";

import { AuthProvider, useAuth } from "@components/auth/context";

import { joinPath, splitPath } from "@lib/util";
import { VaultIndexProvider, vaultIndexContext } from "./context";

export const ProvideVaultIndex: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const vaultIndex = useProvideVaultIndex();
    return <vaultIndexContext.Provider value={vaultIndex}>{children}</vaultIndexContext.Provider>;
};

/**
 * Loads every item of the vault into a new index.
 *
 * @param auth the current authentication provider
 * @param nameCache cache of names that were decrypted earlier
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the index
 */
async function loadIndex(
    auth: AuthProvider,
    nameCache: NameCache,
): Promise<{ success: boolean; error?: string; index?: VaultIndex }> {
    // The root folder is not included in the list of all items, so get it separately
    const rootResponse = await listdir(auth, ".");
    if (!rootResponse.success) {
        return { success: false, error: rootResponse.error };
    }
    const root = { ...rootResponse.directory!, items: undefined };

    const allResponse = await getAllItems(auth);
    if (!allResponse.success) {
        return { success: false, error: allResponse.error };
    }

    const items = await decryptItems(auth, [root, ...allResponse.items!], nameCache);
    return { success: true, index: new VaultIndex(root.id, items) };
}

/**
 * Hook to provide the vault index to the app.
 *
 * @returns an object with the vault index functions
 */
function useProvideVaultIndex(): VaultIndexProvider {
    // Contexts
    const auth = useAuth();

    // References
    const authRef = useRef(auth);

    const indexRef = useRef<VaultIndex | null>(null);
    const loadingRef = useRef<Promise<{ success: boolean; error?: string; index?: VaultIndex }> | null>(null);
    const staleRef = useRef(true);
    const nameCacheRef = useRef<NameCache>(new Map());

    // Functions
    /**
     * Gets the index, (re)loading it first if it is missing or out of date.
     *
     * @param forceReload whether to reload the index even if it is not out of date
     * @returns an object with a success boolean and optionally an error message or the index, and
     *      whether the index was loaded just now
     */
    async function getIndex(
        forceReload: boolean = false,
    ): Promise<{ success: boolean; error?: string; index?: VaultIndex; reloaded: boolean }> {
        if (indexRef.current && !staleRef.current && !forceReload) {
            return { success: true, index: indexRef.current, reloaded: false };
        }

        // Concurrent requests share one load
        if (!loadingRef.current) {
            staleRef.current = false;
            loadingRef.current = loadIndex(authRef.current, nameCacheRef.current).finally(() => {
                loadingRef.current = null;
            });
        }
        const result = await loadingRef.current;
        if (!result.success) {
            staleRef.current = true;
            return { success: false, error: result.error, reloaded: true };
        }

        indexRef.current = result.index!;
        return { success: true, index: result.index!, reloaded: true };
    }

    function invalidate() {
        staleRef.current = true;
    }

    async function resolveFolderID(path: string): Promise<{ success: boolean; error?: string; id?: string }> {
        const parts = splitPath(path);

        for (const forceReload of [false, true]) {
            const result = await getIndex(forceReload);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            const index = result.index!;

            const id = index.resolve(path);
            if (id !== null && (parts.length === 0 || index.get(id)?.type === "directory")) {
                return { success: true, id };
            }
            if (result.reloaded) {
                break; // The index is as fresh as it gets
            }
            // Not found, but the index may be out of date, so try again with a fresh one
        }

        return { success: false, error: "Path not found" };
    }

    async function listdirByPath(path: string): Promise<{ success: boolean; directory?: Directory; error?: string }> {
        const normalizedPath = splitPath(path).join("/") || ".";

        for (const attempt of [0, 1]) {
            if (attempt === 1) {
                // The index may be out of date, so try again with a fresh one
                invalidate();
            }

            const resolved = await resolveFolderID(path);
            if (!resolved.success) {
                return { success: false, error: resolved.error };
            }

            const response = await listdir(authRef.current, resolved.id!);
            if (!response.success) {
                continue;
            }

            const [folder, ...children] = await decryptItems(
                authRef.current,
                [{ ...response.directory!, items: undefined }, ...(response.directory!.items ?? [])],
                nameCacheRef.current,
            );

            // Apply the listing, which is the truth, to the index
            const index = indexRef.current!;
            index.set(folder);
            index.replaceChildren(folder.id, children);

            // Is this folder really at the requested path?
            if (index.pathOf(folder.id) === normalizedPath) {
                const directory = VaultIndex.toFileLike(folder, normalizedPath) as Directory;
                directory.items = children.map((child) =>
                    VaultIndex.toFileLike(child, joinPath(normalizedPath, child.name)),
                );
                return { success: true, directory };
            }
        }

        return { success: false, error: "Path not found or is not a directory" };
    }

    async function getItem(id: string) {
        const result = await getIndex();
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, item: result.index!.get(id) };
    }

    async function search(query: string, limit: number, threshold: number) {
        const result = await getIndex();
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, results: result.index!.search(query, limit, threshold) };
    }

    // Effects
    useLayoutEffect(() => {
        authRef.current = auth;
    }, [auth]);

    useEffect(() => {
        // Drop index when vault changes
        indexRef.current = null;
        staleRef.current = true;
        nameCacheRef.current = new Map();
    }, [auth.vaultInfo?.key]);

    // Stable provider value
    return useMemo(() => ({ resolveFolderID, listdirByPath, getItem, search, invalidate }), []); // eslint-disable-line react-hooks/exhaustive-deps
}
