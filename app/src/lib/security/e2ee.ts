import { checkValidity, getGroup, getSecurityDetails, handshake } from "@lib/security/api";
import generateKey from "@lib/security/keygen";

interface E2EEData {
    /** UUID of the handshake */
    uuid: string;
    /** Bilaterally agreed symmetric key to encrypt communications */
    e2eeKey: Buffer;
    /** Account unlock key (AUK) */
    auk: Buffer;
}

/**
 * Perform end-to-end encryption setup with the server using the SRP protocol.
 *
 * @param apiURL The URL of the API server to query
 * @param password The password to use for key generation
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @param showToast A function to call if a non-fatal error occurs, which takes a message
 * @returns A promise which resolves to the E2EE data, or undefined if the E2EE setup fails
 */
export async function e2ee(
    apiURL: string,
    password: string,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, subheader: string | undefined, message: string | undefined) => void,
    showToast?: (message: string, isError?: boolean) => void,
): Promise<E2EEData | undefined> {
    // Get SRP group used for communication
    setLoadingState?.("Determining SRP group...");
    const groupResponse = await getGroup(apiURL);
    const srpGroup = groupResponse.group;
    if (!srpGroup) {
        stopLoading?.();
        showToast?.(`Unable to determine server's SRP group: ${groupResponse.error!}`, true);
        return;
    }

    console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

    // Get security details
    setLoadingState?.("Loading security details...");
    const securityDetailsResponse = await getSecurityDetails(apiURL);
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
    const auk = await generateKey(password, aukSalt);
    const srpKey = await generateKey(password, srpSalt);
    console.log(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);
    console.log(`Generated SRP key '${srpKey.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

    // Perform SRP handshake
    setLoadingState?.("Performing handshake...");
    console.debug("Handshake...");
    let clientPriv, clientPub, serverPub, sharedU, handshakeUUID;
    for (let tryCount = 0; tryCount < 3; tryCount++) {
        const { priv, pub } = srpGroup.generateClientValues();
        const handshakeResponse = await handshake(apiURL, pub);
        if (!handshakeResponse.success) {
            console.debug(`Handshake failed: ${handshakeResponse.error} (try count: ${tryCount})`);
            continue;
        }

        clientPriv = priv;
        clientPub = pub;
        serverPub = handshakeResponse.serverPub!;
        if (serverPub % srpGroup.prime === 0n) {
            console.debug(`Server sent invalid public value, retrying (try count: ${tryCount})`);
            continue;
        }
        sharedU = srpGroup.computeU(clientPub, serverPub);
        if (sharedU === 0n) {
            console.debug(`Computed U is zero, retrying (try count: ${tryCount})`);
            continue;
        }
        handshakeUUID = handshakeResponse.handshakeUUID;
        break;
    }
    if (!clientPriv || !clientPub || !serverPub || !sharedU || !handshakeUUID) {
        stopLoading?.();
        showAlert?.("Handshake Failed", undefined, "Could not complete handshake. Please try again.");
        return;
    }

    setLoadingState?.("Calculating master...");
    console.debug("Calculating master...");
    const premaster = srpGroup.computePremasterSecret(clientPriv, serverPub, srpKey, sharedU);
    console.debug("Premaster: " + premaster.toString(16));
    const masterKey = srpGroup.premasterToMaster(premaster); // Key used to encrypt communications
    console.log("Master key: " + masterKey.toString("hex"));

    setLoadingState?.("Authentication...");
    console.debug("Verifying M1...");
    const m1 = srpGroup.generateM1(srpSalt, clientPub, serverPub, masterKey);
    const validityResponse = await checkValidity(apiURL, handshakeUUID, srpSalt, clientPub, serverPub, m1);
    if (!validityResponse.success) {
        stopLoading?.();
        if (validityResponse.error === "M1 values do not match") {
            showAlert?.("Client Verification Failed", "Server failed to verify client", "Is the password correct?");
        } else {
            showAlert?.("Client Verification Failed", "Server failed to verify client", validityResponse.error);
        }
        return;
    }

    console.debug("Verifying M2...");
    const m2Server = validityResponse.m2!;
    const m2Client = srpGroup.generateM2(clientPub, m1, masterKey);
    if (!m2Client.equals(m2Server)) {
        stopLoading?.();
        showAlert?.("Server Verification Failed", "Client failed to verify server", "Server may be compromised");
        return;
    }

    console.log(`Bilateral authentication complete; handshake UUID is ${handshakeUUID}`);

    return { uuid: handshakeUUID, e2eeKey: masterKey, auk: auk };
}
