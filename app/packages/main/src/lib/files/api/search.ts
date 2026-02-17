import ExEF from "@lib/exef";
import { File } from "@lib/files/structures";
import { popFetch } from "@lib/network";

import { AuthProvider } from "@components/auth/context";

/**
 * Searches for files matching the given query.
 *
 * @param auth The current authentication provider
 * @param query The search query
 * @param limit The maximum number of results to return
 * @param score_threshold The minimum similarity score (0.0-1.0) for results
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or search results
 */
export async function searchFiles(
    auth: AuthProvider,
    query: string,
    limit: number = 10,
    score_threshold: number = 0.6,
): Promise<{ success: boolean; error?: string; results?: { file: File; similarity: number }[] }> {
    const response = await popFetch(
        `${auth.serverInfo!.apiURL}/files/search?limit=${limit}&score_threshold=${score_threshold}`,
        auth.authInfo!.key!,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.getToken()}`,
                "Content-Type": "application/octet-stream",
                "X-Encrypted": "true",
                "X-Content-Type": "text/plain",
            },
            // @ts-expect-error This is actually a valid body; its just that TS complains about it >:(
            body: new ExEF(auth.authInfo!.key!).encrypt(Buffer.from(query, "utf-8")),
        },
    );
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 422:
            return { success: false, error: "Validation error" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const results = await ExEF.decryptResponse<[File, number][]>(auth.authInfo!.key, response);
    return {
        success: true,
        results: results.map(([file, similarity]) => ({ file, similarity })),
    };
}
