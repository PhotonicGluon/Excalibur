import { createDecipheriv } from "crypto";

import generateKey from "@lib/security/keygen";
import { type _SRPGroup, getSRPGroup } from "@lib/security/srp";
import { getSecurityDetails } from "@lib/users/api";
import { bufferToNumber, numberToBuffer } from "@lib/util";

const MAX_ITER_COUNT = 3;

export interface E2EEData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Account unlock key (AUK) */
    auk: Buffer;
    /** Authentication token */
    token: string;
}

enum E2EEStage {
    GET_SRP_GROUP,
    GET_SERVER_PUBLIC_VALUE,
    SHARED_VALUE_CHECK,
    M_VALUE_CHECKS,
    GET_AUTH_TOKEN,
}

interface E2EEState {
    /** Current stage of the negotiation */
    stage: E2EEStage;
    /** Iteration number for negotiation */
    negotiationIter: number;
    /** SRP group to use */
    srpGroup?: _SRPGroup;
    /** Bilaterally agreed master key */
    master?: Buffer;
    /** Auth token */
    authToken?: string;
    /** Values used in the SRP exchange */
    values?: {
        server?: {
            pub: bigint;
        };
        client?: {
            priv: bigint;
            pub: bigint;
        };
        m1?: Buffer;
        m2?: Buffer;
    };
}

/**
 * Sends a response to the server.
 *
 * @param ws The WebSocket connection to send the response to
 * @param data Optional data to send with the response
 * @param status The status of the response
 */
function sendResponse(ws: WebSocket, data?: string | Buffer, status?: "OK" | "ERR") {
    const response = {
        status: status ?? null,
        binary: data instanceof Buffer,
        data: data instanceof Buffer ? data.toString("base64") : data,
    };
    ws.send(JSON.stringify(response));
}

/**
 * Parses a response from the server.
 *
 * @param data The response data to parse
 * @returns An object containing the status and optional data
 */
function parseResponse(data: any): { status: "OK" | "ERR" | null; data?: string | Buffer } {
    const raw = JSON.parse(data);
    if (raw.binary) {
        return { status: raw.status, data: Buffer.from(raw.data, "base64") };
    }
    return { status: raw.status, data: raw.data };
}

/**
 * Perform end-to-end encryption setup with the server using the SRP protocol.
 *
 * @param apiURL The HTTP(S) URL of the API server to query
 * @param username The username to log in as
 * @param password The password for logging in
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
export async function e2ee(
    apiURL: string,
    username: string,
    password: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
): Promise<E2EEData | undefined> {
    // Get security details
    setLoadingState?.("Loading security details...");
    const securityDetailsResponse = await getSecurityDetails(apiURL, username);
    if (!securityDetailsResponse.success) {
        stopLoading?.();
        showAlert?.("Security Details Not Found", undefined, securityDetailsResponse.error);
        return;
    }
    const aukSalt = securityDetailsResponse.aukSalt!;
    const srpSalt = securityDetailsResponse.srpSalt!;
    console.debug(`Loaded security details with salts '${aukSalt.toString("hex")}' and '${srpSalt.toString("hex")}'`);

    // Generate keys
    setLoadingState?.("Generating keys...");
    const additionalInfo = { username };
    const auk = await generateKey(password, additionalInfo, aukSalt);
    const srpKey = await generateKey(password, additionalInfo, srpSalt);
    console.log(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);
    console.log(`Generated SRP key '${srpKey.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

    // Perform SRP handshake
    const wsURL = apiURL.replace("http", "ws");
    const ws = new WebSocket(`${wsURL}/auth`);

    setLoadingState?.("Checking username...");
    const state: E2EEState = {
        stage: E2EEStage.GET_SRP_GROUP,
        negotiationIter: 0,
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
            console.log(`Connected to server; sending username '${username}'`);
            sendResponse(ws, username);
        });

        ws.addEventListener("message", async (event) => {
            const response = parseResponse(event.data);
            try {
                if (state.stage === E2EEStage.GET_SRP_GROUP) {
                    if (response.status !== "OK") {
                        ws.close();
                        stopLoading?.();
                        showAlert?.("Handshake Failed", undefined, "Could not complete handshake. Please try again.");
                        reject("Server rejected username");
                        return;
                    }

                    const srpBits = parseInt(response.data!.toString());
                    state.srpGroup = getSRPGroup(srpBits);
                    state.stage = E2EEStage.GET_SERVER_PUBLIC_VALUE;
                    console.debug(`Server is using ${state.srpGroup.bits}-bit SRP group`);
                    return;
                }

                if (state.stage === E2EEStage.GET_SERVER_PUBLIC_VALUE) {
                    // Receive server's public value
                    const serverPub = bufferToNumber(response.data! as Buffer);
                    if (serverPub % state.srpGroup!.prime === 0n) {
                        state.negotiationIter++;
                        console.debug(
                            `Server sent invalid public value, retrying (try count: ${state.negotiationIter})`,
                        );
                        ws.send("ERR");
                        if (state.negotiationIter >= MAX_ITER_COUNT) {
                            ws.close();
                            stopLoading?.();
                            showAlert?.(
                                "Handshake Failed",
                                undefined,
                                "Could not complete handshake. Please try again.",
                            );
                            reject("Server keeps sending invalid public value");
                        }
                        return;
                    }

                    state.negotiationIter = 0;
                    state.values = { server: { pub: serverPub } };

                    // Now generate client's ephemeral values and send the public value
                    const { priv, pub } = state.srpGroup!.generateClientValues();
                    state.values.client = { priv, pub };
                    sendResponse(ws, numberToBuffer(pub), "OK");
                    state.stage = E2EEStage.SHARED_VALUE_CHECK;
                    return;
                }

                if (state.stage === E2EEStage.SHARED_VALUE_CHECK) {
                    // Check if the server accepted the client's public value
                    if (response.status !== "OK") {
                        console.log(response.toString());
                        console.debug("Server rejected client's public value, retrying");
                        const { priv, pub } = state.srpGroup!.generateClientValues();
                        state.values!.client = { priv, pub };
                        ws.send(numberToBuffer(pub));
                        return;
                    }

                    // Check shared U value
                    const sharedU = state.srpGroup!.computeU(state.values!.client!.pub, state.values!.server!.pub);
                    if (response.data! !== "U is OK" || sharedU === 0n) {
                        ws.close();
                        stopLoading?.();
                        let message = "Server rejected shared value.";
                        if (sharedU === 0n) {
                            message = "Computed shared value is zero.";
                        }
                        showAlert?.("Hand shake Failed", undefined, message);
                        reject(message);
                        return;
                    }

                    // Calculate master key
                    setLoadingState?.("Calculating master...");
                    console.debug("Calculating master...");
                    const premaster = state.srpGroup!.computePremasterSecret(
                        state.values!.client!.priv,
                        state.values!.server!.pub,
                        srpKey,
                        sharedU,
                    );
                    console.debug("Premaster: " + premaster.toString(16));

                    const masterKey = state.srpGroup!.premasterToMaster(premaster); // Key used to encrypt communications
                    state.master = masterKey;
                    console.log("Master key: " + masterKey.toString("hex"));

                    // Generate client's M1 and send to server
                    setLoadingState?.("Authentication...");
                    console.debug("Verifying M1...");
                    const m1Client = state.srpGroup!.generateM1(
                        username,
                        srpSalt,
                        state.values!.client!.pub,
                        state.values!.server!.pub,
                        masterKey,
                    );
                    sendResponse(ws, m1Client, "OK");

                    state.values!.m1 = m1Client;
                    state.stage = E2EEStage.M_VALUE_CHECKS;
                    return;
                }

                if (state.stage === E2EEStage.M_VALUE_CHECKS) {
                    // Check that server accepted M1
                    if (response.status !== "OK") {
                        ws.close();
                        stopLoading?.();
                        const errorMsg = response.data! as string;
                        if (errorMsg === "M1 values do not match") {
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

                    // Confirm M2 values match
                    const m2Server = response.data! as Buffer;
                    const m2Client = state.srpGroup!.generateM2(
                        state.values!.client!.pub,
                        state.values!.m1!,
                        state.master!,
                    );
                    if (!m2Client.equals(m2Server)) {
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
                    sendResponse(ws, undefined, "OK");
                    state.stage = E2EEStage.GET_AUTH_TOKEN;
                    return;
                }

                if (state.stage === E2EEStage.GET_AUTH_TOKEN) {
                    const auth_token_data = JSON.parse(response.data! as string);
                    const nonce = Buffer.from(auth_token_data.nonce, "base64");
                    const token = Buffer.from(auth_token_data.token, "base64");
                    const tag = Buffer.from(auth_token_data.tag, "base64");

                    const cipher = createDecipheriv("aes-256-gcm", state.master!, nonce);
                    cipher.setAuthTag(tag);

                    const plaintext = Buffer.concat([cipher.update(token), cipher.final()]);
                    state.authToken = plaintext.toString("utf-8");

                    resolve({ key: state.master!, auk: auk, token: state.authToken });
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
