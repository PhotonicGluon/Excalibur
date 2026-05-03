import naturalCompare from "natural-compare";

import { Directory, FileLike } from "./structures";

export enum SortType {
    /** Sort by the item name */
    NAME = "Name",
    /** Sort by the item creation time */
    CREATION_TIME = "Creation Time",
}

type ComparisonResult = 0 | -1 | 1;

// Sort functions
function sortByName(a: FileLike, b: FileLike): ComparisonResult {
    // Use natural sort for names
    return naturalCompare(a.name, b.name);
}

function sortByCreationTime(a: FileLike, b: FileLike): ComparisonResult {
    const delta = a.creation_time - b.creation_time;
    if (delta > 0) {
        return 1;
    } else if (delta < 0) {
        return -1;
    }
    return 0;
}

// Main function
/**
 * Sorts the {@link FileLike} items in the directory.
 *
 * Directories are prioritized over files. Items of the same type are sorted alphabetically
 * by name. The sort order can be ascending or descending based on the `sortAsc` parameter.
 *
 * @param directory the directory to sort
 * @param sortType the type of sorting to perform
 * @param sortAsc whether to sort in ascending order
 * @throws {Error} if the sort type is unknown
 * @returns a sorted array of `FileLike` items. Will be an empty array if `items` is `null` or
 *      empty.
 */
export function sortItems(directory: Directory, sortType: SortType, sortAsc: boolean = true) {
    if (!directory || !directory.items || directory.items.length === 0) {
        return [];
    }

    const items = directory.items;
    function sortFunc(a: FileLike, b: FileLike): ComparisonResult {
        // Directories come before files
        if (a.type === "directory" && b.type === "file") {
            return -1;
        } else if (a.type === "file" && b.type === "directory") {
            return 1;
        }

        // Otherwise, since they are of the same type, sort by the specified type
        let sortVal: ComparisonResult;
        switch (sortType) {
            case SortType.NAME:
                sortVal = sortByName(a, b);
                break;
            case SortType.CREATION_TIME:
                sortVal = sortByCreationTime(a, b);
                break;
            default:
                throw new Error(`Unknown sort type: ${sortType}`);
        }
        return sortAsc ? sortVal : (-sortVal as ComparisonResult);
    }

    return items.sort(sortFunc);
}
