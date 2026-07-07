import { KE3, OPAQUE, SERVER_IDENTITY } from "@lib/auth/opaque";
import { OPAQUEAuthError, OPAQUEServerAuthError } from "@lib/auth/opaque/client";
import ExEF from "@lib/crypto/exef";
import { parseResponse, sendResponse } from "@lib/network/websocket";

import { E2EEData } from "./structures";

enum HandshakeStage {
    SENT_KE1_AND_USERNAME,
    SENT_KE3,
}

interface HandshakeState {
    /** Current stage of the negotiation */
    stage: HandshakeStage;
    /** Bilaterally agreed master key */
    master?: Buffer;
}

/**
 * Perform OPAQUE-3DH protocol handshake.
 *
 * @param apiURL the HTTP(S) URL of the API server to query
 * @param username the username to log in as
 * @param password the password for logging in
 * @param stopLoading a function to call when any loading indicators needs to be stopped
 * @param setLoadingState a function to call to update the loading state with a message
 * @param showAlert a function to call if an error occurs, which takes a header and a message
 * @throws if the handshake fails
 * @returns a promise which resolves to the E2EE data
 */
export async function handshakeOPAQUE(
    apiURL: string,
    username: string,
    password: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
): Promise<E2EEData | undefined> {
    // Perform OPAQUE-3DH handshake
    const wsURL = apiURL.replace("http", "ws");
    const ws = new WebSocket(`${wsURL}/auth/opaque`);

    setLoadingState?.("Sending key exchange message 1...");
    const state: HandshakeState = {
        stage: HandshakeStage.SENT_KE1_AND_USERNAME,
    };

    return new Promise<E2EEData>((resolve, reject) => {
        ws.addEventListener("error", (event) => {
            const e = event as ErrorEvent;
            ws.close();
            console.error(e);
            stopLoading?.();
            showAlert?.("Handshake Failed", undefined, "Could not complete handshake. Please try again.");
            reject(e);
        });

        ws.addEventListener("open", () => {
            console.log(`Connected to server; sending username '${username}' and KE1 message`);
            const ke1 = OPAQUE.generateKE1(new TextEncoder().encode(password));
            const ke1AndUsername = Buffer.concat([ke1.serialize(), new TextEncoder().encode(username)]);
            sendResponse(ws, ke1AndUsername);

            setLoadingState?.("Waiting for key exchange message 2...");
        });

        ws.addEventListener("message", async (event) => {
            const response = parseResponse(event.data as string);
            try {
                if (state.stage === HandshakeStage.SENT_KE1_AND_USERNAME) {
                    if (response.status === "ERR") {
                        ws.close();
                        stopLoading?.();
                        showAlert?.("Handshake Failed", undefined, "Could not complete handshake. Please try again.");
                        reject("Server rejected username");
                        return;
                    }

                    const ke2 = OPAQUE.deserializeKE2(response.data as Uint8Array);

                    // Generate KE3 message to send to server, verifying the server in the process
                    let ke3: KE3;
                    let sessionKey: Uint8Array;
                    try {
                        [ke3, sessionKey] = OPAQUE.generateKE3(
                            new TextEncoder().encode(username),
                            SERVER_IDENTITY,
                            ke2,
                        );
                    } catch (e: unknown) {
                        if (!(e instanceof OPAQUEAuthError)) {
                            throw e;
                        }

                        const opaqueError = e as OPAQUEAuthError;
                        if (opaqueError instanceof OPAQUEServerAuthError) {
                            // Failed to authenticate server
                            ws.close();
                            stopLoading?.();
                            showAlert?.(
                                "Server Verification Failed",
                                "Client failed to verify server",
                                "Server may be compromised",
                            );
                            reject("Server verification failed");
                            return;
                        }

                        // Likely due to incorrect client credentials
                        console.error(e);
                        ws.close();
                        stopLoading?.();
                        showAlert?.(
                            "Handshake Failed",
                            "Invalid username or password",
                            "Please check your credentials and try again",
                        );
                        reject("Invalid username or password");
                        return;
                    }

                    // Send response
                    setLoadingState?.("Sending key exchange message 3...");
                    sendResponse(ws, Buffer.from(ke3.serialize()));

                    // Derive master key
                    state.master = OPAQUE.kdf.expand(Buffer.from(sessionKey), Buffer.from("Master Key"), 32);
                    state.stage = HandshakeStage.SENT_KE3;
                    setLoadingState?.("Waiting for authentication token...");
                    return;
                }

                if (state.stage === HandshakeStage.SENT_KE3) {
                    if (response.status === "ERR") {
                        // Server rejected client
                        ws.close();
                        stopLoading?.();
                        const errorMsg = response.data! as string;
                        if (errorMsg === "Failed to authenticate client") {
                            showAlert?.(
                                "Client Verification Failed",
                                "Server failed to verify client",
                                "Is the password correct?",
                            );
                            reject("Client verification failed");
                        } else {
                            showAlert?.("Client Verification Failed", "Server failed to verify client", errorMsg);
                            reject("Client verification failed");
                        }
                        return;
                    }

                    const encryptedAuthToken = response.data! as Buffer;
                    const authToken = ExEF.decrypt(state.master!, encryptedAuthToken).toString("utf-8");
                    resolve({ key: state.master!, token: authToken });

                    return;
                }
            } catch (e: unknown) {
                ws.close();
                console.error(e);
                stopLoading?.();
                showAlert?.(
                    "Handshake Failed",
                    "Invalid username or password",
                    "Please check your credentials and try again",
                );
                reject(e);
            }
        });
    });
}
