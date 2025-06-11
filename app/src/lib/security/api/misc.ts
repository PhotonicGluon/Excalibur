import { type _SRPGroup, getSRPGroup } from "@lib/security/srp";

/**
 * Fetches the SRP group size from the server, and returns the corresponding
 * {@link SRPGroup} object.
 *
 * @param apiURL The URL of the API server to query.
 * @returns The SRP group size, or an error message.
 */
export async function getGroup(apiURL: string): Promise<{ group?: _SRPGroup; error?: string }> {
    try {
        return fetch(`${apiURL}/security/srp/group-size`).then(async (res) => {
            const groupSize = parseInt(await res.text());
            return { group: getSRPGroup(groupSize) };
        });
    } catch (e) {
        return { error: (e as Error).message };
    }
}
