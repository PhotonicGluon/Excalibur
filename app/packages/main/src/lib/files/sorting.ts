import naturalCompare from "natural-compare";

import { sgn } from "@lib/util";
import { getMIMEType } from "@lib/util/mime";

import { Directory, File, FileLike } from "./structures";

export enum SortType {
    /** Sort by the item name */
    NAME = "Name",
    /** Sort by file size */
    SIZE = "File Size",
    /** Sort by file type */
    TYPE = "File Type",
    /** Sort by the item creation time */
    CREATION_TIME = "Creation Time",
}

export type SortValues = {
    /** The type of sorting to perform */
    sortType: SortType;
    /** Whether to sort in ascending order */
    sortAsc: boolean;
};

type ComparisonResult = 0 | -1 | 1;

// Sort functions
function sortByName(a: FileLike, b: FileLike): ComparisonResult {
    // Use natural sort for names
    return naturalCompare(a.name, b.name);
}

function sortBySize(a: FileLike, b: FileLike): ComparisonResult {
    // Here, either both are files or both are directories
    if (a.type === "directory" && b.type === "directory") {
        // For the case of directories, we use name sorting
        return sortByName(a, b);
    }

    // Both are files, so we can compare their sizes
    return sgn((a as File).size - (b as File).size);
}

function sortByType(a: FileLike, b: FileLike): ComparisonResult {
    const aType = getMIMEType(a.name) || "";
    const bType = getMIMEType(b.name) || "";

    // We directly sort the names of the MIME types
    return naturalCompare(aType, bType);
}

function sortByCreationTime(a: FileLike, b: FileLike): ComparisonResult {
    return sgn(a.creation_time - b.creation_time);
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
            case SortType.SIZE:
                sortVal = sortBySize(a, b);
                break;
            case SortType.TYPE:
                sortVal = sortByType(a, b);
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
