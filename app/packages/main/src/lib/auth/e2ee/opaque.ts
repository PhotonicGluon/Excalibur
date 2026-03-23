import { getSecurityDetails } from "@lib/users/api";

import { E2EEData } from "./helpers";

/**
 * Perform end-to-end encryption setup with the server using the OPAQUE-3DH protocol.
 *
 * @param apiURL The HTTP(S) URL of the API server to query
 * @param username The username to log in as
 * @param password The password for logging in
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @returns A promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
export async function e2eeOPAQUE(
    apiURL: string,
    username: string,
    _password: string,
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
    console.debug(`Loaded security details with salt '${aukSalt.toString("hex")}' and auth protocol '${authProtocol}'`);

    // TODO: Add OPAQUE-3DH protocol interactions
    throw new Error("Not implemented");
}
