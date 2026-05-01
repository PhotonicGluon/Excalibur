import seedrandom from "seedrandom";

import { getAllItems, renameItem } from "@lib/files/api";
import { Directory } from "@lib/files/structures";

import { AuthProvider } from "@components/auth/context";

/**
 * Substitution cipher for obfuscation.
 */
export class SubstitutionCipher {
    private _prng: seedrandom.PRNG;
    private _forwardCipher: number[];
    private _backwardCipher: number[];

    /**
     * Creates a new substitution cipher with the given key.
     *
     * @param key key to use for the cipher
     */
    constructor(key: Buffer) {
        this._prng = seedrandom(key.toString("hex"));

        // Create the substitution maps
        this._forwardCipher = Array.from({ length: 256 }, (_, i) => i);
        this._backwardCipher = Array.from({ length: 256 });

        this._shuffle(this._forwardCipher);
        for (let i = 0; i < 256; i++) {
            this._backwardCipher[this._forwardCipher[i]] = i;
        }
    }

    // Helper methods
    /**
     * Randomly shuffles an array in place using the Fisher–Yates shuffle algorithm.
     *
     * @param array array to shuffle
     */
    private _shuffle(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this._prng() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Main methods
    /**
     * Enciphers a buffer using substitution cipher.
     *
     * @param pt plaintext to encipher
     * @returns ciphertext
     */
    encipher(pt: Buffer): string {
        const ct = Buffer.from(pt.map((b) => this._forwardCipher[b]));
        return ct.toString("hex");
    }

    /**
     * Deciphers a buffer using substitution cipher.
     *
     * @param ct ciphertext to decipher
     * @returns plaintext
     */
    decipher(ct: string): Buffer {
        const ctBuffer = Buffer.from(ct, "hex");
        return Buffer.from(ctBuffer.map((b) => this._backwardCipher[b]));
    }
}

/**
 * Deobfuscates the names of the items in a directory using the given cipher.
 *
 * @param directory directory to deobfuscate
 * @param noc name obfuscation cipher to use
 * @returns deobfuscated directory
 */
export function deobfuscateDirectoryItems(directory: Directory, noc: SubstitutionCipher): Directory {
    if (directory.items) {
        directory.items = directory.items.map((item) => {
            return {
                ...item,
                name:
                    noc.decipher(item.name.replace(/\.exef$/g, "")).toString("utf-8") +
                    (item.type === "file" ? ".exef" : ""),
            };
        });
    }
    return directory;
}

/**
 * Toggles the obfuscation of all files for the current user.
 *
 * @param auth authentication provider
 * @param obfuscated whether to obfuscate or deobfuscate
 * @param setLoadingState function to set the loading state
 */
export async function toggleObfuscationForAllFiles(
    auth: AuthProvider,
    obfuscated: boolean,
    setLoadingState: (state: string) => void,
) {
    // Get items owned by the current user
    const allItemsResponse = await getAllItems(auth);
    if (!allItemsResponse.success) {
        throw new Error(allItemsResponse.error!);
    }

    const rawItems = allItemsResponse.items!;
    const numItems = rawItems.length;

    // Sort by fullpath, with the deepest items processed first
    const items = rawItems.sort((a, b) => b.fullpath.split("/").length - a.fullpath.split("/").length);
    console.debug(`Got ${numItems} items to process: `, items);

    // Rename items
    for (let i = 0; i < items.length; i++) {
        setLoadingState(`Processed ${i} of ${numItems} Items`);
        const item = items[i];

        let newName;
        if (obfuscated) {
            newName = auth.noc!.encipher(Buffer.from(item.name, "utf-8"));
        } else {
            newName = auth.noc!.decipher(item.name).toString("utf-8");
        }

        console.debug(`Renaming item '${item.fullpath}' from '${item.name}' to '${newName}'`);

        const renameItemResponse = await renameItem(auth, item.fullpath, newName);
        if (!renameItemResponse.success) {
            throw new Error(renameItemResponse.error!);
        }
    }

    setLoadingState(`Processed ${numItems} of ${numItems} Items`);
}
