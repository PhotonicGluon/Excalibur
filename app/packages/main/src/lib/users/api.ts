import { createCipheriv, randomBytes } from "crypto";

import ExEF from "@lib/exef";
import { popFetch, timedFetch } from "@lib/network";
import { b64decode, b64encode, numberToBuffer } from "@lib/util";

/**
 * Checks if the user exists on the server.
 *
 * @param apiURL The URL of the Excalibur API
 * @param username The username to check
 * @returns Whether the user exists
 */
export async function checkUser(apiURL: string, username: string): Promise<boolean> {
    const response = await timedFetch(`${apiURL}/users/check/${username}`, {
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
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve security details for
 * @returns A promise which resolves to an object containing the success status, optional AUK and
 *      SRP salts as `Buffer`s, and an optional error message. If the security details file is not
 *      found, success is `false` and an error message is provided
 */
export async function getSecurityDetails(
    apiURL: string,
    username: string,
): Promise<{ success: boolean; aukSalt?: Buffer; srpSalt?: Buffer; error?: string }> {
    const response = await timedFetch(`${apiURL}/users/security/${username}`, {
        method: "GET",
    });
    switch (response.status) {
        case 200:
            break;
        case 404:
            return { success: false, error: "Security details file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return {
        success: true,
        aukSalt: b64decode(data["auk_salt"]),
        srpSalt: b64decode(data["srp_salt"]),
    };
}

/**
 * Retrieves the vault key from the server.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to retrieve the vault key for
 * @param token Authentication token for accessing the server
 * @param e2eeKey The key used to decrypt the end-to-end encrypted communications
 * @returns A promise which resolves to an object containing the success status, an optional error
 *      message, and an optional encrypted vault key
 */
export async function getVaultKey(
    apiURL: string,
    username: string,
    token: string,
    e2eeKey: Buffer,
): Promise<{ success: boolean; error?: string; encryptedKey?: Buffer }> {
    // Fetch the vault key
    const response = await popFetch(`${apiURL}/users/vault/${username}`, e2eeKey, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    switch (response.status) {
        case 200:
            break; // Continue with normal flow
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Vault key file not found" };
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await ExEF.decryptResponse<{ key_enc: string }>(e2eeKey, response);
    return { success: true, encryptedKey: Buffer.from(data.key_enc, "base64") };
}

/**
 * Adds a new user to the server.
 *
 * Assumes that the user has not already been set up.
 *
 * @param apiURL The URL of the API server to query
 * @param ack Account Creation Key (ACK)
 * @param username The username to set up security details for
 * @param aukSalt The account unlock key (AUK) salt to set up
 * @param srpSalt The SRP handshake salt to set up
 * @param verifier The SRP verifier to set up
 * @param encryptedVaultKey The vault key that was encrypted using the AUK
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function addUser(
    apiURL: string,
    ack: Buffer,
    username: string,
    aukSalt: Buffer,
    srpSalt: Buffer,
    verifier: bigint,
    encryptedVaultKey: Buffer,
): Promise<{ success: boolean; error?: string }> {
    // Generate encrypted payload
    const userData = JSON.stringify({
        auk_salt: b64encode(aukSalt),
        srp_salt: b64encode(srpSalt),
        verifier: b64encode(numberToBuffer(verifier)),
        key_enc: b64encode(encryptedVaultKey),
    });

    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", ack, nonce);
    const ciphertext = Buffer.concat([cipher.update(userData), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Send request
    const response = await timedFetch(`${apiURL}/users/add/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nonce: b64encode(nonce),
            enc_data: b64encode(ciphertext),
            tag: b64encode(tag),
        }),
    });

    // Handle response
    switch (response.status) {
        case 201:
            return { success: true };
        case 400:
            return { success: false, error: "Invalid JSON/base64 string after decryption" };
        case 401:
            return { success: false, error: "Invalid account creation key" };
        case 406:
            return { success: false, error: "Invalid base64 string" };
        case 409:
            return { success: false, error: "User already exists" };
        default:
            return { success: false, error: "Unknown error" };
    }
}
