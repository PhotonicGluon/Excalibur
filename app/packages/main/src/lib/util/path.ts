/**
 * @param path Given path
 * @returns Parent directory of the given path
 * @note Follows the behaviour of Python's `Path(...).parent`
 */
export function getParent(path: string): string {
    return path.replace(/\/$/, "").split("/").slice(0, -1).join("/");
}

/**
 * @param path Given path
 * @returns All parent directories of the given path
 * @note Follows the behaviour of Python's `Path(...).parents`
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
 * @param path Given path
 * @returns Base name of the given path
 * @note Follows the behaviour of Python's `os.path.basename()` function
 */
export function getBaseName(path: string): string {
    return path.split("/").at(-1)!;
}
