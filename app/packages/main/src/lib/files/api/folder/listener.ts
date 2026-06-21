import { RefObject } from "react";

import ExEF from "@lib/crypto/exef";
import { getAuthenticatedWS } from "@lib/network/websocket";
import { sleep } from "@lib/util";

import { AuthProvider } from "@components/auth/context";

const RETRY_COUNT = 5;
const RETRY_BACKOFF_MULTIPLIER = 2;
const RETRY_INITIAL_DELAY = 100; // In ms

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
    const ws = getAuthenticatedWS(auth, "/files/listen");

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

    ws.addEventListener("close", (event) => {
        if (isCleaningUp()) {
            return;
        }

        switch (event.code) {
            case 1000:
                console.log("Cleanly disconnected from server");
                break;
            case 1006:
                console.warn("WebSocket connection closed unexpectedly");
                break;
            default:
                console.warn(`WebSocket closed with code ${event.code}: ${event.reason}`);
                break;
        }

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

            const delay = RETRY_INITIAL_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, retryCount - 1);
            console.log(`Attempting to reconnect to listener after ${delay} ms (${retryCount}/${RETRY_COUNT})...`);

            sleep(delay).then(() => {
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
