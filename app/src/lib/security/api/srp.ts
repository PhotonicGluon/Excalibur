import { bufferToNumber, numberToBuffer, padBuffer } from "@lib/util";

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
