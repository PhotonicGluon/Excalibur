/**
 * @param path given path
 * @returns parent directory of the given path
 * @note follows the behaviour of Python's `Path(...).parent`
 */
export function getParent(path: string): string {
    return path.replace(/\/$/, "").split("/").slice(0, -1).join("/");
}

/**
 * @param path given path
 * @returns all parent directories of the given path
 * @note follows the behaviour of Python's `Path(...).parents`
 */
export function getParents(path: string): string[] {
    if (path === "" || path === "/") {
        return [];
    }

    let currentPath = path.replace(/\/$/, "");
    const parents: string[] = [];
    while (true) {
        const lastSlashIndex = currentPath.lastIndexOf("/");

        if (lastSlashIndex === -1) {
            // If we aren't already at ".", the parent is "."
            if (currentPath !== ".") {
                parents.push(".");
            }
            break;
        } else if (lastSlashIndex === 0) {
            // The parent is the root "/"
            parents.push("/");
            break;
        } else {
            // The parent is everything before the last slash
            const parent = currentPath.slice(0, lastSlashIndex);
            parents.push(parent);
            currentPath = parent;
        }
    }

    return parents;
}

/**
 * @param path given path
 * @returns base name of the given path
 * @note follows the behaviour of Python's `os.path.basename()` function
 */
export function getBaseName(path: string): string {
    return path.split("/").at(-1)!;
}

/**
 * Splits a path into its non-trivial parts.
 *
 * @param path the path to split (`.` specifies the root directory)
 * @returns the parts of the path, which is empty if the path refers to the root directory
 */
export function splitPath(path: string): string[] {
    return path.split("/").filter((part) => part !== "" && part !== ".");
}

/**
 * Joins a folder's path and the name of one of its items.
 *
 * @param parentPath the path of the folder (`.` specifies the root directory)
 * @param name the name of the item
 * @returns the path of the item
 */
export function joinPath(parentPath: string, name: string): string {
    return parentPath === "." || parentPath === "" ? name : `${parentPath}/${name}`;
}
