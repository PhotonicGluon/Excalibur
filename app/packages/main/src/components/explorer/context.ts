import { createContext, useContext } from "react";

import { AlertOptions, Color } from "@ionic/core";
import { HookOverlayOptions } from "@ionic/react/dist/types/hooks/HookOverlayOptions";

/**
 * Explorer context to be shared among explorer components that require it.
 */
export interface ExplorerContext {
    /** Current path */
    path: string;
    /** Function to call when renaming is requested */
    onRename: (path: string, isDir: boolean) => Promise<void>;
    /** Function to call when moving is requested */
    onMove: (path: string) => Promise<void>;
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
    /** Present an alert */
    presentAlert: (options: AlertOptions & HookOverlayOptions) => Promise<void>;
    /** Dismiss a presented alert */
    dismissAlert: () => Promise<void>;
    /** Present a snackbar */
    presentSnackbar: (message: string, colour?: Color) => Promise<void>;
}

export const explorerContext = createContext<ExplorerContext>(null!);

/**
 * Hook to get the explorer context.
 *
 * @returns The explorer context
 */
export function useExplorerContext(): ExplorerContext {
    return useContext(explorerContext);
}
