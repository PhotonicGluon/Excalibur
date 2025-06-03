import { decryptResponse } from "@lib/crypto";
import { type _SRPGroup, getSRPGroup } from "@lib/security/srp";
import { bufferToNumber, numberToBuffer, padBuffer } from "@lib/util/buffer";

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

/**
 * Starts the SRP handshake process with the server.
 *
 * @param apiURL The URL of the Excalibur API.
 * @param clientPub The client's public value.
 * @returns A promise which resolves to an object with a success boolean, an optional
 *      error message, and optionally a handshake UUID and the server's public value.
 */
export async function handshake(
    apiURL: string,
    clientPub: bigint,
): Promise<{ success: boolean; error?: string; handshakeUUID?: string; serverPub?: bigint }> {
    const clientPubBuff = padBuffer(numberToBuffer(clientPub), 128);
    const response = await fetch(`${apiURL}/security/srp/handshake`, {
        method: "POST",
        body: clientPubBuff.toString("base64"),
    });
    switch (response.status) {
        case 406:
            return { success: false, error: "Client public value is illegal" };
        case 422:
            return { success: false, error: "Invalid base64 string for verifier" };
        case 503:
            return { success: false, error: "Verifier not found" };
        case 200:
            break; // Continue with normal flow
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return {
        success: true,
        handshakeUUID: data["handshake_uuid"],
        serverPub: bufferToNumber(Buffer.from(data["server_public_value"], "base64")),
    };
}

/**
 * Checks the validity of the client's computed M1 value, replying with the server's M2 value if correct.
 *
 * @param apiURL The URL of the Excalibur API.
 * @param handshakeUUID The UUID for the handshake.
 * @param salt The salt from the handshake.
 * @param clientPub The client's public value from the handshake.
 * @param serverPub The server's public value from the handshake.
 * @param m1 The client's M1 value.
 * @returns A promise which resolves to an object with a success boolean, an optional error message,
 *      and optionally the server's M2 value.
 */
export async function checkValidity(
    apiURL: string,
    handshakeUUID: string,
    salt: Buffer,
    clientPub: bigint,
    serverPub: bigint,
    m1: Buffer,
): Promise<{ success: boolean; error?: string; m2?: Buffer }> {
    const response = await fetch(`${apiURL}/security/srp/check-validity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            handshake_uuid: handshakeUUID,
            salt: salt.toString("base64"),
            client_public_value: numberToBuffer(clientPub).toString("base64"),
            server_public_value: numberToBuffer(serverPub).toString("base64"),
            m1: m1.toString("base64"),
        }),
    });
    switch (response.status) {
        case 404:
            return { success: false, error: "Handshake UUID not found" };
        case 406:
            return { success: false, error: "M1 values do not match" };
        case 422:
            return { success: false, error: "Invalid base64 string for value" };
        case 503:
            return { success: false, error: "Verifier not found" };
        case 200:
            break; // Continue with normal flow
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await response.json();
    return { success: true, m2: Buffer.from(data["m2"], "base64") };
}

/**
 * Generates a token for continued authentication.
 *
 * @param apiURL The URL of the Excalibur API.
 * @param handshakeUUID The UUID for the handshake.
 * @param masterKey The master key to use for encrypting the token.
 * @returns A promise which resolves to an object with a success boolean, an optional error message,
 *      and optionally the token.
 */
export async function login(
    apiURL: string,
    handshakeUUID: string,
    masterKey: Buffer,
): Promise<{ success: boolean; error?: string; token?: string }> {
    const response = await fetch(`${apiURL}/security/login`, {
        method: "POST",
        body: handshakeUUID,
    });
    switch (response.status) {
        case 404:
            return { success: false, error: "Handshake UUID not found or has expired" };
        case 200:
            break; // Continue with normal flow
        default:
            return { success: false, error: "Unknown error" };
    }

    const data = await decryptResponse(response, masterKey);

    return {
        success: true,
        token: data["token"],
    };
}

/**
 * Logs out a user from the server.
 *
 * @param apiURL The URL of the API server to query.
 * @param token The authorization token for the current session.
 * @returns A promise which resolves to an object indicating the success status and an optional error message.
 */
export async function logout(apiURL: string, token: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${apiURL}/security/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    switch (response.status) {
        case 401:
            return { success: false, error: "Unauthorized or invalid token" };
        case 200:
            break; // Continue with normal flow
        default:
            return { success: false, error: "Unknown error" };
    }

    return {
        success: true,
    };
}
