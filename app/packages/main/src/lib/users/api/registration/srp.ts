import { createCipheriv, randomBytes } from "crypto";

import { timedFetch } from "@lib/network";
import { b64encode, numberToBuffer } from "@lib/util";

/**
 * Registers a new user using the Secure Remote Password (SRP) protocol.
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
export async function registerUserSRP(
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
