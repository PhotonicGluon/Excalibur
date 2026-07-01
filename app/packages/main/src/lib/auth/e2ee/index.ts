import { AlertButton } from "@ionic/core";

import { E2EEData } from "@lib/auth/e2ee/structures";
import { AuthProtocol } from "@lib/auth/enums";
import { getAuthInfo } from "@lib/users/api";

import { handshakeOPAQUE } from "./opaque";

/**
 * Perform end-to-end encryption setup with the server.
 *
 * @param apiURL the HTTP(S) URL of the API server to query
 * @param username the username to log in as
 * @param password the password for logging in
 * @param stopLoading a function to call when any loading indicators needs to be stopped
 * @param setLoadingState a function to call to update the loading state with a message
 * @param showAlert a function to call if an error occurs, which takes a header and a message
 * @returns a promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
async function e2ee(
    apiURL: string,
    username: string,
    password: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (
        header: string,
        subheader: string | undefined,
        message: string | undefined,
        buttons?: AlertButton[],
    ) => void,
): Promise<E2EEData | undefined> {
    // Get security details
    setLoadingState?.("Getting user security details...");
    const securityDetailsResponse = await getAuthInfo(apiURL, username);
    if (!securityDetailsResponse.success) {
        stopLoading?.();
        showAlert?.("Security Details Not Found", undefined, securityDetailsResponse.error);
        return;
    }
    const authProtocol = securityDetailsResponse.authProtocol!;
    console.debug(`Obtained authentication info: protocol '${authProtocol}'`);

    // Perform handshake
    let e2eeData: E2EEData | undefined;
    try {
        switch (authProtocol) {
            case AuthProtocol.OPAQUE_3DH:
                e2eeData = await handshakeOPAQUE(apiURL, username, password, stopLoading, setLoadingState, showAlert);
                break;
            default:
                throw new Error(`Unknown auth protocol: ${authProtocol}`);
        }
    } catch (error) {
        console.error(`End-to-end encryption setup failed: ${error}`);
        return;
    }

    // Return E2EE data
    return e2eeData!;
}

export { e2ee, type E2EEData };
