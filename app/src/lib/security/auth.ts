import { type _SRPGroup, getSRPGroup } from "@lib/security/srp";
import { numberToBuffer } from "@lib/util";

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

/**
 * Sets up the SRP verifier on the server.
 *
 * @param apiURL The URL of the API server to query.
 * @param verifier The SRP verifier to set up.
 * @returns A promise which resolves to an object with a success boolean and optionally an error message.
 */
export async function setUpVerifier(apiURL: string, verifier: bigint): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${apiURL}/security/srp/verifier`, {
        method: "POST",
        body: numberToBuffer(verifier).toString("base64"),
    });

    if (response.status === 409) {
        return { success: false, error: "Verifier already exists" };
    } else if (response.status === 422) {
        return { success: false, error: "Invalid base64 string for verifier" };
    } else if (response.status === 201) {
        return { success: true };
    } else {
        return { success: false, error: "Unknown error" };
    }
}
