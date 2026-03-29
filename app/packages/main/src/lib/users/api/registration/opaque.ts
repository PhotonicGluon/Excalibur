import { parseResponse as _parseResponse, generateResponse } from "@lib/auth/e2ee/response-handling";
import { OPAQUE, SERVER_IDENTITY } from "@lib/auth/opaque";
import ExEF from "@lib/exef";

enum RegistrationStage {
    SENT_REGISTRATION_REQUEST,
    SENT_REGISTRATION_RECORD,
}

interface RegistrationState {
    /** Current stage of the negotiation */
    stage: RegistrationStage;
    /** OPRF blinding scalar */
    blind?: bigint;
}

/**
 * Registers a new user using the OPAQUE-3DH protocol.
 *
 * @param apiURL The URL of the API server to query
 * @param username The username to set up security details for
 * @param password The password to set up security details for
 * @param ack Account Creation Key (ACK)
 * @param aukSalt The account unlock key (AUK) salt to set up
 * @param encryptedVaultKey The vault key that was encrypted using the AUK
 * @param commsUUID Communication UUID. Used for upgrading an existing user to OPAQUE from SRP
 *      authentication.
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function registerUserOPAQUE(
    apiURL: string,
    username: string,
    password: string,
    ack: Buffer,
    aukSalt: Buffer,
    encryptedVaultKey: Buffer,
    commsUUID?: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
): Promise<{ success: boolean; error?: string }> {
    // Create special request handling
    function sendResponse(ws: WebSocket, data: Buffer) {
        const serializedData = generateResponse(data);
        const encryptedData = new ExEF(ack).encrypt(Buffer.from(JSON.stringify(serializedData)));
        ws.send(encryptedData);
    }

    async function parseResponse(eventData: Blob | string) {
        try {
            const decryptedData = ExEF.decrypt(ack, Buffer.from(await (eventData as Blob).arrayBuffer()));
            return _parseResponse(decryptedData.toString("utf-8"));
        } catch (_e) {
            // Did the server send it in plaintext?
            return _parseResponse(eventData as string);
        }
    }

    // Set up WebSockets
    const wsURL = apiURL.replace("http", "ws");
    const ws = new WebSocket(`${wsURL}/auth/opaque/register${commsUUID ? `?comms_uuid=${commsUUID}` : ""}`);

    // Perform OPAQUE-3DH registration
    setLoadingState?.("Sending registration request...");
    const state: RegistrationState = {
        stage: RegistrationStage.SENT_REGISTRATION_REQUEST,
    };

    const registrationPromise = new Promise<void>((resolve, reject) => {
        ws.addEventListener("error", (event) => {
            const e = event as ErrorEvent;
            ws.close();
            console.error(e);
            stopLoading?.();
            showAlert?.("Registration Failed", undefined, "Could not complete registration. Please try again.");
            reject(e);
        });

        ws.addEventListener("open", () => {
            console.log(`Connected to server; sending username '${username}' and registration request`);
            const [registrationRequest, blind] = OPAQUE.createRegistrationRequest(new TextEncoder().encode(password));
            const requestAndUsername = Buffer.concat([
                registrationRequest.serialize(),
                new TextEncoder().encode(username),
            ]);
            sendResponse(ws, requestAndUsername);

            state.blind = blind;
            setLoadingState?.("Waiting for registration response...");
        });

        ws.addEventListener("message", async (event: MessageEvent<Blob | string>) => {
            const response = await parseResponse(event.data);
            try {
                if (state.stage === RegistrationStage.SENT_REGISTRATION_REQUEST) {
                    if (response.status === "ERR") {
                        ws.close();
                        stopLoading?.();
                        showAlert?.("Registration Failed", undefined, response.data as string);
                        reject("Server rejected username");
                        return;
                    }

                    const registrationResponse = OPAQUE.deserializeRegistrationResponse(response.data as Uint8Array);

                    // Generate registration record
                    const [registrationRecord, _exportKey] = OPAQUE.finalizeRegistrationRequest(
                        new TextEncoder().encode(password),
                        state.blind!,
                        registrationResponse,
                        SERVER_IDENTITY,
                        new TextEncoder().encode(username),
                    );

                    // Send registration record, AUK salt, and encrypted AUK
                    const toSend = Buffer.concat([registrationRecord.serialize(), aukSalt, encryptedVaultKey]);
                    sendResponse(ws, toSend);
                    state.stage = RegistrationStage.SENT_REGISTRATION_RECORD;
                    setLoadingState?.("Waiting for server confirmation...");
                    return;
                }

                if (state.stage === RegistrationStage.SENT_REGISTRATION_RECORD) {
                    if (response.status !== "OK") {
                        ws.close();

                        stopLoading?.();
                        showAlert?.("Registration Failed", undefined, "Server rejected registration.");
                        reject("Server rejected registration");
                        return;
                    }

                    resolve();
                    return;
                }
            } catch (e: unknown) {
                ws.close();
                console.error(e);
                stopLoading?.();
                showAlert?.("Registration Failed", undefined, "Could not complete registration. Please try again.");
                reject(e);
            }
        });
    });

    try {
        await registrationPromise;
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message };
    }
}
