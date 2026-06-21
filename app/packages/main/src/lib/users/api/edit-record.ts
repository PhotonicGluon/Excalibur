import { OPAQUE, SERVER_IDENTITY } from "@lib/auth/opaque";
import ExEF from "@lib/crypto/exef";
import { parseResponse as _parseResponse, generateResponse, getAuthenticatedWS } from "@lib/network/websocket";

import { AuthProvider } from "@components/auth/context";

import { RegistrationStage, RegistrationState } from "./registration/opaque";

/**
 * Updates a user's OPAQUE registration record.
 *
 * @param apiURL the URL of the API server to query
 * @param newUsername the new username of the user
 * @param newPassword the new password of the user
 * @param stopLoading the function to call when any loading indicators needs to be stopped
 * @param setLoadingState the function to call to update the loading state with a message
 * @param showAlert the function to call if an error occurs, which takes a header and a message
 * @returns a promise which resolves to an object with a success boolean and optionally an error
 *      message
 */
export async function editRecord(
    auth: AuthProvider,
    newUsername: string,
    newPassword: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
): Promise<{ success: boolean; error?: string }> {
    console.log("INPUT, newUsername:", newUsername, "newPassword:", newPassword);
    // Create special request handling
    function sendResponse(ws: WebSocket, data: Buffer) {
        const serializedData = generateResponse(data);
        const encryptedData = new ExEF(auth.authInfo!.key!).encrypt(Buffer.from(JSON.stringify(serializedData)));
        ws.send(encryptedData);
    }

    async function parseResponse(eventData: Blob | string) {
        try {
            const decryptedData = ExEF.decrypt(
                auth.authInfo!.key!,
                Buffer.from(await (eventData as Blob).arrayBuffer()),
            );
            return _parseResponse(decryptedData.toString("utf-8"));
        } catch (_e) {
            // Did the server send it in plaintext?
            return _parseResponse(eventData as string);
        }
    }

    const ws = getAuthenticatedWS(auth, "/auth/opaque/edit-record");

    // Perform record updating
    setLoadingState?.("Sending record updating request...");
    const state: RegistrationState = {
        stage: RegistrationStage.SENT_REGISTRATION_REQUEST,
    };

    const recordUpdatePromise = new Promise<void>((resolve, reject) => {
        ws.addEventListener("error", (event) => {
            const e = event as ErrorEvent;
            ws.close();
            console.error(e);
            stopLoading?.();
            showAlert?.("Record Update Failed", undefined, "Could not complete record update. Please try again.");
            reject(e);
        });

        ws.addEventListener("open", () => {
            console.log(`Connected to server; sending username '${newUsername}' and record update request`);
            const [registrationRequest, blind] = OPAQUE.createRegistrationRequest(
                new TextEncoder().encode(newPassword),
            );
            const requestAndUsername = Buffer.concat([
                registrationRequest.serialize(),
                new TextEncoder().encode(newUsername),
            ]);
            sendResponse(ws, requestAndUsername);

            state.blind = blind;
            setLoadingState?.("Waiting for record update response...");
        });

        ws.addEventListener("message", async (event: MessageEvent<Blob | string>) => {
            const response = await parseResponse(event.data);
            try {
                if (state.stage === RegistrationStage.SENT_REGISTRATION_REQUEST) {
                    if (response.status === "ERR") {
                        ws.close();
                        stopLoading?.();
                        showAlert?.("Record Update Failed", undefined, response.data as string);
                        reject("Server rejected username");
                        return;
                    }

                    const registrationResponse = OPAQUE.deserializeRegistrationResponse(response.data as Uint8Array);

                    // Generate new registration record
                    const [registrationRecord, _exportKey] = OPAQUE.finalizeRegistrationRequest(
                        new TextEncoder().encode(newPassword),
                        state.blind!,
                        registrationResponse,
                        SERVER_IDENTITY,
                        new TextEncoder().encode(newUsername),
                    );

                    // Send new registration record
                    sendResponse(ws, Buffer.from(registrationRecord.serialize()));
                    state.stage = RegistrationStage.SENT_REGISTRATION_RECORD;
                    setLoadingState?.("Waiting for server confirmation...");
                    return;
                }

                if (state.stage === RegistrationStage.SENT_REGISTRATION_RECORD) {
                    if (response.status !== "OK") {
                        ws.close();

                        stopLoading?.();
                        showAlert?.("Record Update Failed", undefined, "Server rejected record update.");
                        reject("Server rejected record update");
                        return;
                    }

                    resolve();
                    return;
                }
            } catch (e: unknown) {
                ws.close();
                console.error(e);
                stopLoading?.();
                showAlert?.("Record Update Failed", undefined, "Could not complete record update. Please try again.");
                reject(e);
            }
        });
    });

    try {
        await recordUpdatePromise;
        return { success: true };
    } catch (e: unknown) {
        return { success: false, error: (e as Error).message };
    }
}
