import { Directory } from "@lib/files/structures";

import { AuthProvider } from "@components/auth/context";

import { listdir } from "./list";

/** Cache of the (normalized) folder paths we have seen to the IDs of the folders at that path */
const folderIDCache = new Map<string, string>();

/**
 * Splits a path into its non-trivial parts.
 *
 * @param path the path to split (`.` specifies the root directory)
 * @returns the parts of the path, which is empty if the path refers to the root directory
 */
function splitPath(path: string): string[] {
    return path.split("/").filter((part) => part !== "" && part !== ".");
}

/**
 * Remembers the IDs of the folders directly inside the given directory.
 *
 * @param directory the directory whose subfolders to remember
 */
function cacheSubfolders(directory: Directory) {
    for (const item of directory.items ?? []) {
        if (item.type === "directory") {
            folderIDCache.set(splitPath(item.fullpath).join("/"), item.id);
        }
    }
}

/**
 * Clears the remembered folder IDs.
 *
 * Should be called whenever the folder structure may have changed.
 */
export function clearFolderIDCache() {
    folderIDCache.clear();
}

/**
 * Finds the ID of the folder at the given path by walking down from the root directory.
 *
 * @param auth the current authentication provider
 * @param path the path of the folder (`.` specifies the root directory)
 * @param useCache whether to use the folder IDs that were remembered from earlier lookups
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the ID of the folder
 */
export async function resolveFolderID(
    auth: AuthProvider,
    path: string,
    useCache: boolean = true,
): Promise<{ success: boolean; error?: string; id?: string }> {
    const parts = splitPath(path);
    if (parts.length === 0) {
        return { success: true, id: "." };
    }

    const cached = useCache ? folderIDCache.get(parts.join("/")) : undefined;
    if (cached) {
        return { success: true, id: cached };
    }

    // Walk down the path, one folder at a time
    let currentID = ".";
    for (let i = 0; i < parts.length; i++) {
        const response = await listdir(auth, currentID);
        if (!response.success) {
            return { success: false, error: response.error };
        }

        cacheSubfolders(response.directory!);
        const child = response.directory!.items?.find((item) => item.type === "directory" && item.name === parts[i]);
        if (!child) {
            return { success: false, error: "Path not found" };
        }
        currentID = child.id;
    }

    return { success: true, id: currentID };
}

/**
 * Lists the contents of the directory at the given path.
 *
 * @param auth the current authentication provider
 * @param path the path to list (`.` specifies the root directory)
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message or the directory object
 */
export async function listdirByPath(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; directory?: Directory; error?: string }> {
    const normalizedPath = splitPath(path).join("/");

    for (const useCache of [true, false]) {
        const resolved = await resolveFolderID(auth, path, useCache);
        if (!resolved.success) {
            return { success: false, error: resolved.error };
        }

        const response = await listdir(auth, resolved.id!);
        if (response.success) {
            const directory = response.directory!;
            if (resolved.id === "." || splitPath(directory.fullpath).join("/") === normalizedPath) {
                cacheSubfolders(directory);
                if (resolved.id !== ".") {
                    folderIDCache.set(normalizedPath, directory.id);
                }
                return response;
            }
        }

        // The remembered ID is out of date (e.g., the folder was moved or renamed), so try again without it
        folderIDCache.delete(normalizedPath);
    }

    return { success: false, error: "Path not found or is not a directory" };
}
