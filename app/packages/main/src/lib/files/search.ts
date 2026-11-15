import { File } from "@lib/files/structures";
import { VaultIndex } from "@lib/files/vault-index";

/** A file that matched a search, along with how well it matched. */
export interface SearchResult {
    /** The file that matched */
    file: File;
    /** How similar the file's name is to the query (from 0 to 1) */
    similarity: number;
}

/**
 * Searches the names of the files in the vault.
 *
 * Searching has to happen on the client, since the server cannot see the names.
 *
 * @param index the index of the vault to search in
 * @param _query the text to search for
 * @param limit the maximum number of results to return
 * @param _threshold the minimum similarity (from 0 to 1) for a file to be returned
 * @returns the matching files
 */
export function searchIndex(index: VaultIndex, _query: string, limit: number, _threshold: number): SearchResult[] {
    // TODO: Properly implement using Fuzzy matching
    return index
        .items()
        .filter((item) => item.type === "file")
        .slice(0, limit)
        .map((item) => ({
            file: VaultIndex.toFileLike(item, index.pathOf(item.id) ?? item.name) as File,
            similarity: 1,
        }));
}
