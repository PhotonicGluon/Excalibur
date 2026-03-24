import { E2EEData, HandshakeData } from "@lib/auth/e2ee/structures";
import { AuthProtocol } from "@lib/auth/enums";
import generateKey from "@lib/auth/keygen";
import { getSecurityDetails } from "@lib/users/api";

import { handshakeOPAQUE } from "./opaque";
import { handshakeSRP } from "./srp";

/**
 * Perform end-to-end encryption setup with the server.
 *
 * @param apiURL The HTTP(S) URL of the API server to query
 * @param username The username to log in as
 * @param password The password for logging in
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
async function e2ee(
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
    const authProtocol = securityDetailsResponse.authProtocol!;
    console.debug(
        `Loaded security details with salt '${aukSalt.toString("hex")}' and authentication protocol '${authProtocol}'`,
    );

    // Generate keys
    setLoadingState?.("Generating keys...");
    const additionalInfo = { username };
    const auk = await generateKey(password, additionalInfo, aukSalt);
    console.log(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);

    // Perform handshake
    let handshakeData: HandshakeData | undefined;
    switch (authProtocol) {
        case AuthProtocol.SRP:
            handshakeData = await handshakeSRP(
                apiURL,
                username,
                password,
                securityDetailsResponse.srpSalt!,
                additionalInfo,
                stopLoading,
                setLoadingState,
                showAlert,
            );
            break;
        case AuthProtocol.OPAQUE_3DH:
            handshakeData = await handshakeOPAQUE(apiURL, username, password, stopLoading, setLoadingState, showAlert);
            break;
        default:
            throw new Error(`Unknown auth protocol: ${authProtocol}`);
    }

    // Return E2EE data
    return {
        auk,
        ...handshakeData!,
    };
}

export { e2ee, type E2EEData };
