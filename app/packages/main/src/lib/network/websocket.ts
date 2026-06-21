import { generatePoPHeader } from "@lib/auth/pop";
import { getURLEncodedPath, quotePlus } from "@lib/url";
import { b64decode, b64encode } from "@lib/util";

import { AuthProvider } from "@components/auth/context";

/**
 * Creates an authenticated WebSocket connection.
 *
 * @param auth the current authentication provider
 * @param path the path to the WebSocket endpoint
 * @returns the authenticated websocket object
 */
export function getAuthenticatedWS(auth: AuthProvider, path: string): WebSocket {
    const wsURL = `${auth.serverInfo!.apiURL!.replace("http", "ws")}${path}`;
    const popHeader = generatePoPHeader(auth.authInfo!.key, "WEBSOCKET", getURLEncodedPath(wsURL));
    const ws = new WebSocket(`${wsURL}?auth_token=${auth.getToken()}&hmac_validation=${quotePlus(popHeader)}`);

    return ws;
}

/**
 * Generates a response object for the server.
 *
 * @param data optional data to send with the response
 * @param status the status of the response
 * @returns a response object
 */
export function generateResponse(data?: string | Buffer, status?: "OK" | "ERR") {
    return {
        status: status ?? null,
        binary: data instanceof Buffer,
        data: data instanceof Buffer ? b64encode(data) : data,
    };
}
/**
 * Sends a response to the server.
 *
 * @param ws the WebSocket connection to send the response to
 * @param data optional data to send with the response
 * @param status the status of the response
 */
export function sendResponse(ws: WebSocket, data?: string | Buffer, status?: "OK" | "ERR") {
    ws.send(JSON.stringify(generateResponse(data, status)));
}

/**
 * Parses a response from the server.
 *
 * @param data the response data to parse
 * @returns an object containing the status and optional data
 */
export function parseResponse(data: string): { status: "OK" | "ERR" | null; data?: string | Buffer } {
    const raw = JSON.parse(data);
    if (raw.binary) {
        return { status: raw.status, data: b64decode(raw.data) };
    }
    return { status: raw.status, data: raw.data };
}
