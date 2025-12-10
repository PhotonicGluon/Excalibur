import { useCallback, useState } from "react";

import { Color } from "@ionic/core/components";

import { directoryChangesListener, listdir } from "@lib/files/api";
import { Directory } from "@lib/files/structures";
import { useEffectOnce } from "@lib/hooks/generic";

import { useAuth } from "@components/auth/context";

/**
 * React hook that provides access to directory listing functionality.
 *
 * @param currentFolder Current directory path
 * @param presentSnackbar Function that presents a snackbar message
 * @returns Object containing directory contents and a function to refresh them
 */
export function useDirectory(
    currentFolder: string,
    presentSnackbar: (message: string, colour?: Color) => void,
): { directoryContents: Directory | null; refreshContents: () => Promise<void> } {
    // States
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);

    // Contexts
    const auth = useAuth();

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
            // FIXME: `currentFolder` here is still caching the old path even though it shouldn't
            if (sourceFolder && sourceFolder !== currentFolder) {
                console.debug(`Not refreshing contents (changed '${sourceFolder}' is not current '${currentFolder}')`);
                // We are in a different folder than the one we want to refresh, so no need to refresh
                return;
            }

            const response = await listdir(auth, currentFolder);
            if (!response.success) {
                presentSnackbar(response.error!, "danger");
                return;
            }
            setDirectoryContents(response.directory!);
        },
        [auth, presentSnackbar, currentFolder],
    );

    // Effects
    useEffectOnce(() => {
        directoryChangesListener(auth, (path) => {
            refreshContents(path);
        });
    });

    return { directoryContents, refreshContents };
}
