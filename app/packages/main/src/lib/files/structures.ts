export type ItemType = "file" | "directory" | "parent";

export interface FileLike {
    /** Unique identifier for the item, as assigned by the server */
    id: string;
    /** ID of the folder that contains the item, or `null` for the root folder */
    parent_id: string | null;
    /** Name of item (decrypted) */
    name: string;
    /** Creation time of the item */
    creation_time: number;
    /**
     * Path to the item from the root directory.
     *
     * This is computed on the client and is not stored on the server.
     */
    fullpath: string;
    /** Type of the item */
    type: ItemType;
}

export interface File extends FileLike {
    type: "file";
    /** Size of the file in bytes */
    size: number;
}

export interface Directory extends FileLike {
    type: "directory";
    /** List of filelike instances in the directory */
    items: (File | Directory)[] | null;
}
