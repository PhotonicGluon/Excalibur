import { useCallback, useEffect, useRef, useState } from "react";

import { Directory } from "@lib/files/structures";

import { directoryChangesListener } from "@api/files";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";
import { useVaultIndex } from "@components/files/context";

/**
 * React hook that provides access to directory listing functionality.
 *
 * @returns Object containing directory contents, a function to refresh them, and a boolean
 *      indicating if the listener is connected
 */
export function useDirectory(): {
    directoryContents: Directory | null;
    refreshContents: (sourceFolder?: string) => Promise<void>;
    listenerConnected: boolean;
} {
    // States
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);
    const [listenerConnected, setListenerConnected] = useState<boolean>(false);

    const refreshContentsRef = useRef<() => Promise<void>>(Promise.resolve);
    const onFolderChangedRef = useRef<(folderID: string) => Promise<void>>(Promise.resolve);
    const currentFolderIDRef = useRef<string | null>(null);
    const latestRequestRef = useRef<number>(0);

    // Contexts
    const auth = useAuth();
    const vaultIndex = useVaultIndex();

    const explorerContext = useExplorerContext();
    const path = explorerContext.path;
    const presentSnackbar = explorerContext.presentSnackbar;

    // Functions
    /**
     * Fetches the contents of the current directory and updates the component state to reflect
     * the new contents.
     *
     * If the request fails, it displays a toast with an error message and does not update the
     * component state.
     *
     * @param showToast If true, displays a toast telling the user that the page was refreshed
     * @param sourceFolder The folder that triggered the refresh
     */
    const refreshContents = useCallback(
        async (sourceFolder?: string) => {
            if (sourceFolder && sourceFolder !== path) {
                console.debug(`Not refreshing contents (changed '${sourceFolder}' is not current '${path}')`);
                // We are in a different folder than the one we want to refresh, so no need to refresh
                return;
            }

            // Mark down what request number this is
            const requestNum = latestRequestRef.current + 1;
            setDirectoryContents(null);
            latestRequestRef.current = requestNum;

            // Get the directory contents
            const response = await vaultIndex.listdirByPath(path);
            if (!response.success) {
                presentSnackbar("Failed to refresh contents", "danger");
                return;
            }

            const directory = response.directory!;

            // If this request is not the latest, ignore it
            if (requestNum < latestRequestRef.current) {
                console.debug(`Not setting directory contents (${requestNum} < latest ${latestRequestRef.current})`);
                return;
            }

            // Set the directory contents
            currentFolderIDRef.current = directory.id;
            setDirectoryContents(directory);
        },
        [vaultIndex, path, presentSnackbar],
    );

    /**
     * Handles a change to the contents of a folder, which may be the one that is displayed.
     *
     * @param folderID the ID of the folder whose contents changed (`.` for the root directory)
     */
    const onFolderChanged = useCallback(
        async (folderID: string) => {
            // What we know about the vault's structure may now be out of date
            vaultIndex.invalidate();

            let changedFolderID = folderID;
            if (folderID === ".") {
                const root = await vaultIndex.resolveFolderID(".");
                if (!root.success) {
                    return;
                }
                changedFolderID = root.id!;
            }

            if (changedFolderID === currentFolderIDRef.current) {
                await refreshContentsRef.current();
            } else {
                console.debug(`Not refreshing contents (changed '${folderID}' is not the current folder)`);
            }
        },
        [vaultIndex],
    );

    // Effects
    useEffect(() => {
        refreshContentsRef.current = refreshContents;
    }, [refreshContents]);

    useEffect(() => {
        onFolderChangedRef.current = onFolderChanged;
    }, [onFolderChanged]);

    useEffect(() => {
        const cleanup = directoryChangesListener(
            auth,
            () => setListenerConnected(true),
            () => setListenerConnected(false),
            onFolderChangedRef,
        );
        return cleanup;
    }, [auth]);

    return { directoryContents, refreshContents, listenerConnected };
}
