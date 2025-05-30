import { checkValidity, getGroup, getSecurityDetails, handshake } from "@lib/security/auth";
import { KeygenAdditionalInfo, generateKey } from "@lib/security/keygen";

/**
 * Perform end-to-end encryption setup with the server using the SRP protocol.
 *
 * @param apiURL The URL of the API server to query
 * @param password The password to use for key generation
 * @param additionalInfo Additional information to use for key generation
 * @param stopLoading A function to call when any loading indicators needs to be stopped
 * @param setLoadingState A function to call to update the loading state with a message
 * @param showAlert A function to call if an error occurs, which takes a header and a message
 * @param showToast A function to call if a non-fatal error occurs, which takes a message
 * @returns A promise which resolves to an object with a UUID for the handshake and the master key
 *      used to encrypt communications, or undefined if the handshake could not be completed
 */
export async function e2ee(
    apiURL: string,
    password: string,
    additionalInfo: KeygenAdditionalInfo,
    stopLoading?: () => void,
    setLoadingState?: (message: string) => void,
    showAlert?: (header: string, message: string | undefined) => void,
    showToast?: (message: string) => void,
): Promise<{ uuid: string; key: Buffer } | undefined> {
    // Get SRP group used for communication
    setLoadingState?.("Determining SRP group...");
    const groupResponse = await getGroup(apiURL);
    const srpGroup = groupResponse.group;
    if (!srpGroup) {
        stopLoading?.();
        showToast?.(`Unable to determine server's SRP group: ${groupResponse.error!}`);
        return;
    }

    console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

    // Get security details
    setLoadingState?.("Loading security details...");
    const securityDetailsResponse = await getSecurityDetails(apiURL);
    if (!securityDetailsResponse.success) {
        stopLoading?.();
        showAlert?.("Security Details Not Found", securityDetailsResponse.error);
        return;
    }
    const aukSalt = securityDetailsResponse.aukSalt!;
    const srpSalt = securityDetailsResponse.srpSalt!;
    console.debug(`Loaded security details with salts '${aukSalt.toString("hex")}' and '${srpSalt.toString("hex")}'`);

    // Generate SRP key
    setLoadingState?.("Generating SRP key...");
    const key = await generateKey(password, additionalInfo, srpSalt);
    console.log(`Generated key '${key.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

    // Perform SRP handshake
    setLoadingState?.("Performing handshake...");
    console.debug("Handshake...");
    let clientPriv, clientPub, serverPub, sharedU, handshakeUUID;
    for (let tryCount = 0; tryCount < 3; tryCount++) {
        let { priv, pub } = srpGroup.generateClientValues();
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
        showAlert?.("Handshake Failed", "Could not complete handshake. Please try again.");
        return;
    }

    setLoadingState?.("Calculating master...");
    console.debug("Calculating master...");
    const premaster = srpGroup.computePremasterSecret(clientPriv, serverPub, key, sharedU);
    console.debug("Premaster: " + premaster.toString(16));
    const masterKey = srpGroup.premasterToMaster(premaster); // Key used to encrypt communications
    console.log("Master key: " + masterKey.toString("hex"));

    setLoadingState?.("Authentication...");
    console.debug("Verifying M1...");
    const m1 = srpGroup.generateM1(srpSalt, clientPub, serverPub, masterKey);
    const validityResponse = await checkValidity(apiURL, handshakeUUID, srpSalt, clientPub, serverPub, m1);
    if (!validityResponse.success) {
        stopLoading?.();
        showAlert?.("Client Verification Failed", `Server failed to verify client: ${validityResponse.error!}`);
        return;
    }

    console.debug("Verifying M2...");
    const m2Server = validityResponse.m2!;
    const m2Client = srpGroup.generateM2(clientPub, m1, masterKey);
    if (!m2Client.equals(m2Server)) {
        stopLoading?.();
        showAlert?.("Server Verification Failed", "Client failed to verify server.");
        return;
    }

    console.log(`Bilateral authentication complete; handshake UUID is ${handshakeUUID}`);

    return { uuid: handshakeUUID, key: masterKey };
}
