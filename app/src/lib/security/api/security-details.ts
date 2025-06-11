import { numberToBuffer } from "@lib/util";

/**
 * Checks if the security details is set up on the server.
 *
 * @param apiURL The URL of the Excalibur API.
 * @returns Whether the security details is set up.
 */
export async function checkSecurityDetails(apiURL: string) {
    const response = await fetch(`${apiURL}/security/details`, {
        method: "HEAD",
    });
    if (response.status === 404) {
        return false;
    }

    return true;
}

/**
 * Retrieves the security details from the server.
 *
 * @param apiURL The URL of the API server to query.
 * @returns A promise which resolves to an object containing the success status, optional AUK and
 *      SRP salts as `Buffer`s, and an optional error message. If the security details file is not
 *      found, success is `false` and an error message is provided.
 */
export async function getSecurityDetails(apiURL: string): Promise<{
    success: boolean;
    aukSalt?: Buffer;
    srpSalt?: Buffer;
    error?: string;
}> {
    const response = await fetch(`${apiURL}/security/details`, {
        method: "GET",
    });
    if (response.status === 404) {
        return { success: false, error: "Security details file not found" };
    }

    const data = await response.json();
    return {
        success: true,
        aukSalt: Buffer.from(data["auk_salt"], "base64"),
        srpSalt: Buffer.from(data["srp_salt"], "base64"),
    };
}

/**
 * Sets up the security details on the server.
 *
 * @param apiURL The URL of the API server to query.
 * @param aukSalt The account unlock key (AUK) salt to set up.
 * @param srpSalt The SRP handshake salt to set up.
 * @param verifier The SRP verifier to set up.
 * @returns A promise which resolves to an object with a success boolean and optionally an error message.
 */
export async function setUpSecurityDetails(
    apiURL: string,
    aukSalt: Buffer,
    srpSalt: Buffer,
    verifier: bigint,
): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${apiURL}/security/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auk_salt: aukSalt.toString("base64"),
            srp_salt: srpSalt.toString("base64"),
            verifier: numberToBuffer(verifier).toString("base64"),
        }),
    });
    switch (response.status) {
        case 409:
            return { success: false, error: "Security details file already exists" };
        case 422:
            return { success: false, error: "Invalid base64 string" };
        case 201:
            return { success: true };
        default:
            return { success: false, error: "Unknown error" };
    }
}
