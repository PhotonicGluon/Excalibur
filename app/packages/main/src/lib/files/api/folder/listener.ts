import { RefObject } from "react";

import { generatePoPHeader } from "@lib/auth/pop";
import ExEF from "@lib/exef";
import { getURLEncodedPath, quotePlus } from "@lib/url";

import { AuthProvider } from "@components/auth/context";
import { sleep } from "@lib/util";

const RETRY_COUNT = 3;
const RETRY_INTERVAL = 1000;

/**
 * Helper function that handles the authentication part of the WebSocket connection.
 *
 * @param auth the current authentication provider
 * @returns the websocket object
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
 * Helper function that handles connection to the file listener WebSocket and sets up message event
 * handling.
 *
 * @param auth the current authentication provider
 * @param onConnect callback function to be called when the WebSocket connection is established
 * @param onDisconnect callback function to be called when the WebSocket connection is closed
 * @param onPathUpdateRef reference to a callback function to be called when a directory change is
 *      detected
 * @param isCleaningUp function to check if the WebSocket connection is being cleaned up
 * @returns the WebSocket object
 */
function connectToListener(
    auth: AuthProvider,
    onConnect: () => void,
    onDisconnect: () => void,
    onPathUpdateRef: RefObject<(path: string) => Promise<void>>,
    isCleaningUp: () => boolean,
): WebSocket {
    const ws = getWS(auth);

    ws.addEventListener("open", () => {
        if (isCleaningUp()) {
            ws.close();
            return;
        }
        console.log("Connected to server; listening for directory changes");
        onConnect();
    });

    ws.addEventListener("message", async (event) => {
        if (isCleaningUp()) {
            return;
        }
        const data = event.data as Blob;
        const pathEncrypted = Buffer.from(await data.arrayBuffer());
        const path = ExEF.decrypt(auth.authInfo!.key, pathEncrypted).toString("utf-8");
        console.debug(`Noticed '${path}' folder content change`);
        await onPathUpdateRef.current(path);
    });

    ws.addEventListener("close", () => {
        if (isCleaningUp()) {
            return;
        }
        console.log("Disconnected from server");
        onDisconnect();
    });

    return ws;
}

/**
 * Sets up a WebSocket connection to listen for directory changes.
 *
 * @param auth the current authentication provider
 * @param onConnect callback function to be called when the listener connection is established
 * @param onDisconnect callback function to be called when the listener connection is closed
 * @param onPathUpdateRef reference to a callback function to be called when a directory change is
 *      detected
 * @returns a cleanup function to close the WebSocket connection
 */
export function directoryChangesListener(
    auth: AuthProvider,
    onConnect: () => void,
    onDisconnect: () => void,
    onPathUpdateRef: RefObject<(path: string) => Promise<void>>,
) {
    let retryCount = 0;
    let isCleaningUp = false;

    const onConnectInternal = () => {
        retryCount = 0;
        onConnect();
    };
    const onDisconnectInternal = () => {
        if (isCleaningUp) {
            return;
        }
        if (retryCount < RETRY_COUNT) {
            retryCount++;
            console.log(`Attempting to reconnect to listener (${retryCount}/${RETRY_COUNT})...`);
            sleep(RETRY_INTERVAL).then(() => {
                if (!isCleaningUp) {
                    ws = connectToListener(
                        auth,
                        onConnectInternal,
                        onDisconnectInternal,
                        onPathUpdateRef,
                        () => isCleaningUp,
                    );
                }
            });
        } else if (retryCount >= RETRY_COUNT) {
            console.warn("Max retry attempts reached. Stopping reconnection attempts.");
        }
        onDisconnect();
    };

    console.log("Setting up directory changes listener");
    let ws: WebSocket = connectToListener(
        auth,
        onConnectInternal,
        onDisconnectInternal,
        onPathUpdateRef,
        () => isCleaningUp,
    );
    return () => {
        isCleaningUp = true;
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    };
}
