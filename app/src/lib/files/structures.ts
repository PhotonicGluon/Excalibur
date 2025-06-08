export type ItemType = "file" | "directory";

export interface FileLike {
    /** Name of item */
    name: string;
    /** Path to the item from the root directory */
    fullpath: string;
    /** Type of the item */
    type: ItemType;
}

export interface File extends FileLike {
    type: "file";
    /** Size of the file in bytes */
    size: number;
    /** MIME type of the file */
    mimetype: string;
}

export interface Directory extends FileLike {
    type: "directory";
    /** List of filelike instances in the directory */
    items: (File | Directory)[] | null;
}
