import { useCallback, useEffect, useRef, useState } from "react";

import { directoryChangesListener, listdir } from "@lib/files/api";
import { Directory } from "@lib/files/structures";
import { useMount } from "@lib/hooks/generic";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";

/**
 * React hook that provides access to directory listing functionality.
 *
 * @returns Object containing directory contents and a function to refresh them
 */
export function useDirectory(): { directoryContents: Directory | null; refreshContents: () => Promise<void> } {
    // States
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);
    const refreshContentsRef = useRef<() => Promise<void>>(Promise.resolve);

    // Contexts
    const auth = useAuth();
    const explorerContext = useExplorerContext();

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
            if (sourceFolder && sourceFolder !== explorerContext.path) {
                console.debug(
                    `Not refreshing contents (changed '${sourceFolder}' is not current '${explorerContext.path}')`,
                );
                // We are in a different folder than the one we want to refresh, so no need to refresh
                return;
            }

            const response = await listdir(auth, explorerContext.path);
            if (!response.success) {
                explorerContext.presentSnackbar(response.error!, "danger");
                return;
            }
            setDirectoryContents(response.directory!);
        },
        [auth, explorerContext],
    );

    // Effects
    useEffect(() => {
        refreshContentsRef.current = refreshContents;
    }, [refreshContents]);

    useMount(() => {
        directoryChangesListener(auth, refreshContentsRef);
    });

    return { directoryContents, refreshContents };
}
