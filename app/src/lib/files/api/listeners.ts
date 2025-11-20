import ExEF from "@lib/exef";
import { generatePoPHeader } from "@lib/security/pop";
import { getURLEncodedPath, quotePlus } from "@lib/url";

import { AuthProvider } from "@components/auth/context";

/**
 * Helper function that handles the authentication part of the WebSocket connection.
 *
 * @param auth The current authentication provider
 * @returns The websocket object
 */
function getWS(auth: AuthProvider): WebSocket {
    const wsURL = auth.serverInfo!.apiURL!.replace("http", "ws");
    const listenerURL = `${wsURL}/files/listen`;

    const popHeader = generatePoPHeader(auth.authInfo!.key, "WEBSOCKET", getURLEncodedPath(listenerURL));
    const ws = new WebSocket(
        `${wsURL}/files/listen?auth_token=${auth.getToken()}&hmac_validation=${quotePlus(popHeader)}`,
    );

    return ws;
}

/**
 * Sets up a WebSocket connection to listen for directory changes.
 *
 * @param auth The current authentication provider
 * @param onPathUpdate The callback function to be called when a directory change is detected
 */
export function directoryChangesListener(auth: AuthProvider, onPathUpdate: (path: string) => void) {
    const ws = getWS(auth);

    ws.addEventListener("open", () => {
        console.log("Connected to server; listening for directory changes");
    });

    ws.addEventListener("error", (event) => {
        const e = event as ErrorEvent;
        ws.close();
        console.error(e);
    });

    ws.addEventListener("message", async (event) => {
        const data = event.data as Blob;
        const pathEncrypted = Buffer.from(await data.arrayBuffer());
        const path = ExEF.decrypt(auth.authInfo!.key, pathEncrypted).toString("utf-8");
        onPathUpdate(path);
    });

    ws.addEventListener("close", () => {
        console.log("Disconnected from server");
    });
}
