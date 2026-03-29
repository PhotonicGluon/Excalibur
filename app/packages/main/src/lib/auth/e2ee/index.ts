import { AlertButton } from "@ionic/core";

import { E2EEData, HandshakeData } from "@lib/auth/e2ee/structures";
import { AuthProtocol } from "@lib/auth/enums";
import generateKey from "@lib/auth/keygen";
import { decodeJWT } from "@lib/auth/token";
import { getSecurityDetails } from "@lib/users/api";
import { registerUserOPAQUE } from "@lib/users/api/registration/opaque";

import { handshakeOPAQUE } from "./opaque";
import { handshakeSRP } from "./srp";

/**
 * Perform end-to-end encryption setup with the server.
 *
 * @param apiURL The HTTP(S) URL of the API server to query
 * @param username The username to log in as
 * @param password The password for logging in
 * @param startLoading A function to call to start any loading indicators
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
async function e2ee(
    apiURL: string,
    username: string,
    password: string,
    startLoading?: () => void,
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

    // If currently on SRP, prompt user whether to upgrade to OPAQUE
    let upgradeToOPAQUE: boolean | null = null;
    if (authProtocol === AuthProtocol.SRP) {
        stopLoading?.();
        upgradeToOPAQUE = await new Promise<boolean>((resolve) => {
            showAlert?.(
                "Upgrade to OPAQUE",
                undefined,
                "You are currently using Secure Remote Password (SRP) to authenticate. Would you like to upgrade to OPAQUE for better security?",
                [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            resolve(false);
                            startLoading?.();
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: () => {
                            resolve(true);
                            startLoading?.();
                        },
                    },
                ],
            );
        });
    }

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

    // Handle OPAQUE upgrade if needed
    if (upgradeToOPAQUE) {
        const reregisterResponse = await registerUserOPAQUE(
            apiURL,
            username,
            password,
            handshakeData!.key, // Use the established session key to communicate
            Buffer.alloc(32), // We don't care about the AUK salt; the server will retrieve it for us
            Buffer.alloc(0), // We also don't care about the encrypted vault key
            decodeJWT<Record<string, string>>(handshakeData!.token).uuid,
            stopLoading,
            setLoadingState,
            showAlert,
        );
        if (!reregisterResponse.success) {
            throw new Error("Failed to upgrade to OPAQUE");
        }
    }

    // Return E2EE data
    return {
        auk,
        ...handshakeData!,
    };
}

export { e2ee, type E2EEData };
