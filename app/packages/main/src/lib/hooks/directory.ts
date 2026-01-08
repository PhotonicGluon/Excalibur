import { useCallback, useEffect, useRef, useState } from "react";

import { directoryChangesListener, listdir } from "@lib/files/api";
import { Directory } from "@lib/files/structures";
import { useMount } from "@lib/hooks/generic";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";

const LISTDIR_RETRY_COUNT = 3;

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

            let directory: Directory | undefined;

            for (let i = 0; i < LISTDIR_RETRY_COUNT; i++) {
                const response = await listdir(auth, explorerContext.path);
                if (response.success) {
                    directory = response.directory;
                    break;
                } else {
                    console.warn(
                        `Failed to refresh contents (attempt ${i + 1} of ${LISTDIR_RETRY_COUNT}): ${response.error}`,
                    );
                }
            }

            if (!directory) {
                explorerContext.presentSnackbar("Failed to refresh contents", "danger");
                return;
            }

            setDirectoryContents(directory);
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
