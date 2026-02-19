import naturalCompare from "natural-compare";

import { Directory, FileLike } from "./structures";

/**
 * Sorts the {@link FileLike} items in the directory.
 *
 * Directories are prioritized over files. Items of the same type are sorted alphabetically
 * by name. The sort order can be ascending or descending based on the `sortAsc` state.
 *
 * @param directory The directory to sort
 * @param sortAsc Whether to sort in ascending order
 * @returns A sorted array of `FileLike` items. Will be an empty array if `items` is `null` or
 *      empty.
 */
export function sortItems(directory?: Directory, sortAsc: boolean = true) {
    if (!directory || !directory.items || directory.items.length === 0) {
        return [];
    }

    const items = directory.items;

    function sortFunc(a: FileLike, b: FileLike): number {
        // Directories come before files
        if (a.type === "directory" && b.type === "file") {
            return -1;
        } else if (a.type === "file" && b.type === "directory") {
            return 1;
        }

        // Otherwise, since they are of the same type, sort by name using 'natural' ordering
        const sortVal = naturalCompare(a.name, b.name);
        return sortAsc ? sortVal : -sortVal;
    }

    return items.sort(sortFunc);
}
