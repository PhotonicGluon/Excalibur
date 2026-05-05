import { useCallback, useEffect, useRef, useState } from "react";

import { directoryChangesListener, listdir } from "@lib/files/api";
import { deobfuscateDirectoryItems } from "@lib/files/obfuscation";
import { Directory } from "@lib/files/structures";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";

/**
 * React hook that provides access to directory listing functionality.
 *
 * @returns Object containing directory contents and a function to refresh them
 */
export function useDirectory(): {
    directoryContents: Directory | null;
    refreshContents: (sourceFolder?: string) => Promise<void>;
} {
    // States
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);

    const refreshContentsRef = useRef<() => Promise<void>>(Promise.resolve);
    const latestRequestRef = useRef<number>(0);

    // Contexts
    const auth = useAuth();

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
            const response = await listdir(auth, path);
            if (!response.success) {
                presentSnackbar("Failed to refresh contents", "danger");
                return;
            }

            let directory = response.directory!;

            // If this request is not the latest, ignore it
            if (requestNum < latestRequestRef.current) {
                console.debug(`Not setting directory contents (${requestNum} < latest ${latestRequestRef.current})`);
                return;
            }

            // Deobfuscate the names, if necessary
            if (auth.authInfo!.obfuscatedNames && directory.items && auth.noc) {
                directory = deobfuscateDirectoryItems(directory, auth.noc);
            }

            // Set the deobfuscated directory contents
            setDirectoryContents(directory);
        },
        [auth, path, presentSnackbar],
    );

    // Effects
    useEffect(() => {
        refreshContentsRef.current = refreshContents;
    }, [refreshContents]);

    useEffect(() => {
        directoryChangesListener(auth, refreshContentsRef);
    }, [auth]);

    return { directoryContents, refreshContents };
}
