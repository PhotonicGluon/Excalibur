// Helper functions
/**
 * Wrap readEntries in a promise to make working with readEntries easier, since `readEntries()` will
 * return only _**some**_ of the entries in a directory.
 *
 * @param directoryReader Reader for the desired directory
 * @returns A promise that resolves to the read entries, or `undefined` if there is nothing else to
 *      read
 * @note Adapted from https://stackoverflow.com/a/53058574
 */
async function readEntriesPromise(directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[] | undefined> {
    try {
        return await new Promise<FileSystemEntry[]>((resolve, reject) => {
            directoryReader.readEntries(resolve, reject);
        });
    } catch (err) {
        console.log(err);
    }
}

/**
 * Get all the entries (files or sub-directories) in a directory.
 *
 * @param directoryReader Reader for the desired directory
 * @returns *All* file files in the directory
 * @note Adapted from https://stackoverflow.com/a/53058574
 */
async function readAllDirectoryEntries(directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const entries = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries && readEntries.length > 0) {
        entries.push(...readEntries);
        readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
}

// Main functions
/**
 * Gets all file entries within the given `entries`.
 *
 * @param entries File system entries to read
 * @returns List of **all** files that can be read from the given `entries`
 */
export async function getAllFileEntries(entries: FileSystemEntry[]): Promise<FileSystemFileEntry[]> {
    // Adapted from https://stackoverflow.com/a/53058574
    const queue = entries.copyWithin(0, entries.length);

    const fileEntries: FileSystemFileEntry[] = [];
    while (queue.length > 0) {
        const entry = queue.shift()!; // Will not be undefined
        if (entry.isFile) {
            fileEntries.push(entry as FileSystemFileEntry);
        } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            queue.push(...(await readAllDirectoryEntries(reader)));
        }
    }

    return fileEntries;
}
