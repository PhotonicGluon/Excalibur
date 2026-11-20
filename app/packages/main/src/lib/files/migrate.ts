import { computeNameTag, encryptName, validateName } from "@lib/files/names";
import { UserVaultInfo } from "@lib/users/structures";
import { chunk } from "@lib/util";

import { PendingName, fillNames, getPendingNames, hasPendingNames } from "@api/files";
import { editVaultInfo } from "@api/users";

import { AuthProvider } from "@components/auth/context";

const FETCH_PAGE_SIZE = 500;
const FILL_PAGE_SIZE = 200;
const MAX_MIGRATION_RETRIES = 3;

/**
 * Gets the name that a pending item should have once it has been migrated.
 *
 * @param auth the current authentication provider
 * @param item the item to get the name of
 * @returns the item's name
 */
function getLegacyDisplayName(auth: AuthProvider, item: PendingName): string {
    let name = item.name;
    if (!item.isFolder) {
        name = name.replace(/\.exef$/, "");
    }
    if (auth.vaultInfo!.info.obfuscatedNames) {
        name = auth.noc!.decipher(name).toString("utf-8");
    }
    return name;
}

/**
 * Stops names from being obfuscated, since they are all encrypted properly now.
 *
 * @param auth the current authentication provider
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
async function clearObfuscation(auth: AuthProvider): Promise<{ success: boolean; error?: string }> {
    if (!auth.vaultInfo!.info.obfuscatedNames) {
        return { success: true };
    }

    const info: UserVaultInfo = { obfuscatedNames: false };
    const response = await editVaultInfo(
        auth.serverInfo!.apiURL!,
        auth.getToken()!,
        auth.authInfo!.key,
        auth.vaultInfo!.keygenAlgorithm,
        info,
    );
    if (!response.success) {
        return { success: false, error: `Could not update user vault info: ${response.error}` };
    }

    auth.setVaultInfo({ ...auth.vaultInfo!, info });
    return { success: true };
}

/**
 * Replaces the plaintext names of the current user's items with encrypted ones.
 *
 * This is resumable. If it is interrupted, calling it again only handles the names that are still
 * in plaintext.
 *
 * Note that the items are marked as changed by the server, so the Merkle tree needs to be synced
 * afterwards (if it is active).
 *
 * @param auth the current authentication provider
 * @param onProgress optional callback invoked after every chunk with the current progress
 * @param numRetries how many more times to go back for names that were added while migrating
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function migrateNamesToEncrypted(
    auth: AuthProvider,
    onProgress?: (progress: { migratedCount: number; totalCount: number }) => void,
    numRetries: number = MAX_MIGRATION_RETRIES,
): Promise<{ success: boolean; error?: string }> {
    // Find everything that needs migrating
    const pending: PendingName[] = [];
    for (let offset = 0; ; offset += FETCH_PAGE_SIZE) {
        const result = await getPendingNames(auth, FETCH_PAGE_SIZE, offset);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        pending.push(...result.items!);
        if (result.items!.length < FETCH_PAGE_SIZE) {
            break;
        }
    }

    // Encrypt the names, one chunk at a time
    const keys = auth.vaultInfo!.nameKeys;
    let migratedCount = 0;
    onProgress?.({ migratedCount, totalCount: pending.length });

    for (const items of chunk(pending, FILL_PAGE_SIZE)) {
        const names: Record<string, { name_enc: string; name_tag: string }> = {};
        for (const item of items) {
            const name = getLegacyDisplayName(auth, item);
            const nameError = validateName(name);
            if (nameError !== null) {
                return { success: false, error: `Cannot encrypt the name of item '${item.id}': ${nameError}` };
            }

            const nameData = {
                name_enc: (await encryptName(keys, item.id, name)).toString("base64"),
                name_tag: computeNameTag(keys, item.parentID, name).toString("base64"),
            };
            if (nameData.name_enc.length > auth.authInfo!.maxEncryptedNameSize) {
                return { success: false, error: `Cannot encrypt the name of item '${item.id}': Name is too long` };
            }
            names[item.id] = nameData;
        }

        const fillResult = await fillNames(auth, names);
        if (!fillResult.success) {
            return { success: false, error: fillResult.error };
        }

        migratedCount += items.length;
        onProgress?.({ migratedCount, totalCount: pending.length });
    }

    // Make sure that nothing was added in the meantime
    const pendingResult = await hasPendingNames(auth);
    if (!pendingResult.success) {
        return { success: false, error: pendingResult.error };
    }
    if (pendingResult.pending) {
        if (numRetries <= 0) {
            return {
                success: false,
                error: "Names are being added faster than they can be encrypted; try again later",
            };
        }
        return await migrateNamesToEncrypted(auth, onProgress, numRetries - 1);
    }

    return await clearObfuscation(auth);
}
