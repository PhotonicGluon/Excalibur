import { createDecipheriv } from "crypto";

import { parseResponse, sendResponse } from "@lib/auth/e2ee/response-handling";
import generateKey from "@lib/auth/keygen";
import { KE3, OPAQUE, SERVER_IDENTITY } from "@lib/auth/opaque";
import { OPAQUEAuthError, OPAQUEClientAuthError } from "@lib/auth/opaque/client";
import { getSecurityDetails } from "@lib/users/api";
import { b64decode } from "@lib/util";

import { HandshakeData } from "./structures";

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
 * @param apiURL The HTTP(S) URL of the API server to query
 * @param username The username to log in as
 * @param password The password for logging in
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to the handshake data, or undefined if the handshake fails
 */
export async function handshakeOPAQUE(
    apiURL: string,
    username: string,
    password: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
): Promise<HandshakeData | undefined> {
    // Get security details
    setLoadingState?.("Loading security details...");
    const securityDetailsResponse = await getSecurityDetails(apiURL, username);
    if (!securityDetailsResponse.success) {
        stopLoading?.();
        showAlert?.("Security Details Not Found", undefined, securityDetailsResponse.error);
        return;
    }
    const aukSalt = securityDetailsResponse.aukSalt!;
    const authProtocol = securityDetailsResponse.authProtocol!;
    console.debug(`Loaded security details with salt '${aukSalt.toString("hex")}' and auth protocol '${authProtocol}'`);

    // Generate keys
    setLoadingState?.("Generating keys...");
    const additionalInfo = { username };
    const auk = await generateKey(password, additionalInfo, aukSalt);
    console.log(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);

    // Perform OPAQUE-3DH handshake
    const wsURL = apiURL.replace("http", "ws");
    const ws = new WebSocket(`${wsURL}/auth/opaque`);

    setLoadingState?.("Sending key exchange message 1...");
    const state: HandshakeState = {
        stage: HandshakeStage.SENT_KE1_AND_USERNAME,
    };

    return new Promise<HandshakeData>((resolve, reject) => {
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
                        if (opaqueError instanceof OPAQUEClientAuthError) {
                            // Likely due to incorrect client credentials
                            ws.close();
                            stopLoading?.();
                            showAlert?.(
                                "Authentication Failed",
                                "Invalid username or password",
                                "Please check your credentials and try again",
                            );
                            reject("Invalid username or password");
                            return;
                        }

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

                    const authTokenData = JSON.parse(response.data! as string);
                    const nonce = b64decode(authTokenData.nonce);
                    const token = b64decode(authTokenData.token);
                    const tag = b64decode(authTokenData.tag);

                    const cipher = createDecipheriv("aes-256-gcm", state.master!, nonce);
                    cipher.setAuthTag(tag);

                    const plaintext = Buffer.concat([cipher.update(token), cipher.final()]);
                    resolve({ key: state.master!, token: plaintext.toString("utf-8") });
                    return;
                }
            } catch (e: unknown) {
                ws.close();
                console.error(e);
                stopLoading?.();
                showAlert?.("Handshake Failed", undefined, "Could not complete handshake. Please try again.");
                reject(e);
            }
        });
    });
}
