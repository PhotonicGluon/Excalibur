import Fuse from "fuse.js";

import { resolveName } from "@lib/files/names";
import { Directory, File, FileLike, ItemType } from "@lib/files/structures";
import { chunk, splitPath } from "@lib/util";

import { ItemWire } from "@api/files";

import { AuthProvider } from "@components/auth/context";

const DECRYPT_CHUNK_SIZE = 500;
const UNREADABLE_NAME_PREFIX = "(Unknown)";

/** An item in the {@link VaultIndex}, with its name decrypted. */
export interface IndexedItem extends Omit<FileLike, "fullpath"> {
    /** Size of the file in bytes (files only) */
    size?: number;
}

/**
 * Cache of decrypted names, keyed by item ID.
 *
 * An entry is only reused if the item's encrypted name is unchanged.
 */
export type NameCache = Map<string, { nameEnc: string; name: string }>;

/**
 * Decrypts the names of the items sent by the server.
 *
 * If an item's name cannot be decrypted, it is given a placeholder name.
 *
 * @param auth the current authentication provider
 * @param items the items to decrypt the names of
 * @param cache optional cache of names that were decrypted earlier. It is updated with the names
 *      that were decrypted by this call
 * @returns the indexed items, in the same order as {@link items}
 */
export async function decryptItems(auth: AuthProvider, items: ItemWire[], cache?: NameCache): Promise<IndexedItem[]> {
    const keys = auth.vaultInfo!.nameKeys;
    const noc = auth.vaultInfo!.info.obfuscatedNames ? auth.noc : null;

    async function decryptOneItem(item: ItemWire): Promise<IndexedItem> {
        let name: string;
        if (item.parent_id === null) {
            name = ""; // The root folder is unnamed
        } else if (item.name_enc !== null && cache?.get(item.id)?.nameEnc === item.name_enc) {
            // Encrypted name found in cache, so use the cached name
            name = cache.get(item.id)!.name;
        } else {
            // We have to decrypt the name
            try {
                name = await resolveName(keys, noc, item);
                if (item.name_enc !== null) {
                    cache?.set(item.id, { nameEnc: item.name_enc, name });
                }
            } catch (error: unknown) {
                console.error(`Could not read the name of item '${item.id}': ${(error as Error).message}`);
                name = UNREADABLE_NAME_PREFIX + " " + item.id.slice(0, 8);
            }
        }

        return {
            id: item.id,
            parent_id: item.parent_id,
            name,
            type: item.type,
            creation_time: item.creation_time,
            size: item.size,
        };
    }

    const result: IndexedItem[] = [];
    for (const itemChunk of chunk(items, DECRYPT_CHUNK_SIZE)) {
        result.push(...(await Promise.all(itemChunk.map(decryptOneItem))));
    }
    return result;
}

/**
 * Index of every item in a vault, with decrypted names and the ability to look up items by path or
 * by ID.
 */
export class VaultIndex {
    private readonly _rootID: string;
    private readonly _items = new Map<string, IndexedItem>();
    private readonly _searcher: Fuse<IndexedItem>; // TODO: Should we use `FuseWorker`?
    private readonly _children = new Map<string, Map<string, string>>(); // Folder ID -> (name -> child ID)

    /**
     * Creates an index.
     *
     * @param rootID the ID of the vault's root folder
     * @param items the items in the vault, including the root folder
     */
    constructor(rootID: string, items: IndexedItem[] = []) {
        this._rootID = rootID;
        this._searcher = new Fuse(items, { keys: ["name"], includeScore: true });

        for (const item of items) {
            this.set(item);
        }
    }

    /**
     * Gets an item by its ID.
     *
     * @param id the ID of the item
     * @returns the item, or `undefined` if it is not in the index
     */
    get(id: string): IndexedItem | undefined {
        return this._items.get(id);
    }

    /**
     * Gets every item in the index.
     *
     * @returns all of the items, including the root folder
     */
    items(): IndexedItem[] {
        return [...this._items.values()];
    }

    /**
     * Gets the items directly inside a folder.
     *
     * @param folderID the ID of the folder
     * @returns the items in the folder
     */
    childrenOf(folderID: string): IndexedItem[] {
        return [...(this._children.get(folderID)?.values() ?? [])].map((id) => this._items.get(id)!);
    }

    /**
     * Adds an item to the index, replacing the item with the same ID if there is one.
     *
     * @param item the item to add
     */
    set(item: IndexedItem) {
        this.remove(item.id);

        this._items.set(item.id, item);
        this._searcher.add(item);

        if (item.parent_id !== null) {
            if (!this._children.has(item.parent_id)) {
                this._children.set(item.parent_id, new Map());
            }
            this._children.get(item.parent_id)!.set(item.name, item.id);
        }
    }

    /**
     * Removes an item from the index. Does nothing if the item is not in it.
     *
     * Note that the descendants of a removed folder stay in the index.
     *
     * @param id the ID of the item to remove
     */
    remove(id: string) {
        const item = this._items.get(id);
        if (!item) {
            return;
        }
        this._items.delete(id);
        this._searcher.remove((doc) => doc.id === id);

        if (item.parent_id !== null) {
            const siblings = this._children.get(item.parent_id);
            if (siblings?.get(item.name) === id) {
                siblings.delete(item.name);
            }
        }
    }

    /**
     * Replaces everything that the index knows about the contents of a folder.
     *
     * Used to apply a fresh listing of the folder.
     *
     * @param folderID the ID of the folder
     * @param items the items that are now in the folder
     */
    replaceChildren(folderID: string, items: IndexedItem[]) {
        for (const child of this.childrenOf(folderID)) {
            this.remove(child.id);
        }
        for (const item of items) {
            this.set(item);
        }
    }

    /**
     * Finds the ID of the item at a path.
     *
     * @param path the path to look up (`.` specifies the root directory)
     * @returns the ID of the item, or `null` if there is no item at the path
     */
    resolve(path: string): string | null {
        let currentID = this._rootID;
        for (const part of splitPath(path)) {
            const childID = this._children.get(currentID)?.get(part);
            if (childID === undefined) {
                return null;
            }
            currentID = childID;
        }
        return currentID;
    }

    /**
     * Finds the path of an item.
     *
     * @param id the ID of the item
     * @returns the path of the item (`.` for the root directory), or `null` if the item, or one of
     *      its ancestors, is not in the index
     */
    pathOf(id: string): string | null {
        const parts: string[] = [];
        let current = this._items.get(id);
        while (current && current.id !== this._rootID) {
            parts.push(current.name);
            current = current.parent_id === null ? undefined : this._items.get(current.parent_id);
        }
        if (!current) {
            return null;
        }
        return parts.length === 0 ? "." : parts.reverse().join("/");
    }

    /**
     * Searches the names of the files in the vault.
     *
     * @param query the text to search for
     * @param limit the maximum number of results to return, with `undefined` meaning no limit
     * @param threshold minimum similarity (from 0 to 1) for an item to be returned, defaults to 0.6
     * @returns the matching items and their similarity scores
     */
    search(query: string, limit?: number, threshold: number = 0.6): { item: IndexedItem; similarity: number }[] {
        return this._searcher
            .search(query, { limit })
            .filter((result) => result.score !== undefined && 1 - result.score >= threshold)
            .map((result) => ({ item: result.item, similarity: result.score! }));
    }

    /**
     * Converts an indexed item to the type that the UI works with.
     *
     * @param item the item to convert
     * @param fullpath the path of the item
     * @returns the file or (empty) directory
     */
    static toFileLike(item: IndexedItem, fullpath: string): File | Directory {
        const base: FileLike = {
            id: item.id,
            parent_id: item.parent_id,
            name: item.name,
            creation_time: item.creation_time,
            fullpath,
            type: item.type as ItemType,
        };
        if (item.type === "file") {
            return { ...base, type: "file", size: item.size ?? 0 };
        }
        return { ...base, type: "directory", items: null };
    }
}
