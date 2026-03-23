import { b64decode, b64encode } from "@lib/util";

export interface E2EEData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Account unlock key (AUK) */
    auk: Buffer;
    /** Authentication token */
    token: string;
}

/**
 * Sends a response to the server.
 *
 * @param ws The WebSocket connection to send the response to
 * @param data Optional data to send with the response
 * @param status The status of the response
 */
export function sendResponse(ws: WebSocket, data?: string | Buffer, status?: "OK" | "ERR") {
    const response = {
        status: status ?? null,
        binary: data instanceof Buffer,
        data: data instanceof Buffer ? b64encode(data) : data,
    };
    ws.send(JSON.stringify(response));
}

/**
 * Parses a response from the server.
 *
 * @param data The response data to parse
 * @returns An object containing the status and optional data
 */
export function parseResponse(data: string): { status: "OK" | "ERR" | null; data?: string | Buffer } {
    const raw = JSON.parse(data);
    if (raw.binary) {
        return { status: raw.status, data: b64decode(raw.data) };
    }
    return { status: raw.status, data: raw.data };
}
