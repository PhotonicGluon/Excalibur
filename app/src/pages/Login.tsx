import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonPage,
    useIonAlert,
    useIonToast,
} from "@ionic/react";
import { randomBytes } from "crypto";

import { checkConnection } from "@lib/network";
import {
    checkSecurityDetails,
    checkValidity,
    getGroup,
    getSecurityDetails,
    handshake,
    setUpSecurityDetails,
} from "@lib/security/auth";
import { generateKey } from "@lib/security/keygen";
import { randbits } from "@lib/security/util";
import { validateURL } from "@lib/validators";

import URLInput from "@components/inputs/URLInput";

const Login: React.FC = () => {
    // States
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // Functions
    function getAllValues() {
        // Get raw inputs
        const inputs = document.querySelectorAll("ion-input");

        // Preprocess
        let server = inputs[0].value! as string;
        server = server.replace(/\/$/, ""); // Remove trailing slash

        let password = inputs[1].value! as string;

        // Form values
        return { server: server, password: password };
    }

    function validateValues({ server, password }: { server: string; password: string }) {
        // Check all filled
        if (server === "" || password === "") {
            return false;
        }

        // Check server URL
        if (!validateURL(server)) {
            return false;
        }

        return true;
    }

    async function onLoginButtonClick() {
        // Check values
        const values = getAllValues();
        if (!validateValues(values)) {
            presentAlert({
                header: "Invalid Values",
                message: "Some values are missing or invalid.",
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Received values: ${JSON.stringify(values)}`);

        // Check connectivity to the server
        if (!(await checkConnection(values.server))) {
            presentAlert({
                header: "Connection Failure",
                message: `Could not connect to ${values.server}.`,
                buttons: ["OK"],
            });
            return;
        }

        const apiURL = `${values.server}/api/v1`;

        // Get SRP group used for communication
        const groupResponse = await getGroup(apiURL);
        const srpGroup = groupResponse.group;
        if (!srpGroup) {
            presentToast({
                message: `Unable to determine server's SRP group: ${groupResponse.error!}`,
                duration: 3000,
            });
            return;
        }

        console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

        // Check whether verifier has been set up
        if (!(await checkSecurityDetails(apiURL))) {
            presentAlert({
                header: "Verifier Not Set Up",
                message: "Verifier has not been set up. Would you like to set it up now with your entered password?",
                buttons: [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            console.debug("Verifier setup cancelled.");
                            presentToast({
                                message: "Verifier setup cancelled",
                                duration: 3000,
                            });
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: async () => {
                            // Set up security details
                            const aukSalt = randomBytes(32);
                            const srpSalt = randomBytes(32);

                            console.debug(
                                `Created salts '${aukSalt.toString("hex")}' and '${srpSalt.toString("hex")}'`,
                            );
                            const key = generateKey(values.password, srpSalt);
                            console.log(
                                `Generated key '${key.toString("hex")}' with salt '${srpSalt.toString("hex")}'`,
                            );

                            const verifier = srpGroup.generateVerifier(key);

                            await setUpSecurityDetails(apiURL, aukSalt, srpSalt, verifier);
                            console.debug("Security details set up");
                            presentToast({
                                message: "Security details set up. Please log in again.",
                                duration: 5000,
                            });
                        },
                    },
                ],
            });
            return;
        }

        // Get security details
        const securityDetailsResponse = await getSecurityDetails(apiURL);
        if (!securityDetailsResponse.success) {
            presentAlert({
                header: "Security Details Not Found",
                message: securityDetailsResponse.error,
                buttons: ["OK"],
            });
            return;
        }
        const aukSalt = securityDetailsResponse.aukSalt!;
        const srpSalt = securityDetailsResponse.srpSalt!;
        console.debug(
            `Loaded security details with salts '${aukSalt.toString("hex")}' and '${srpSalt.toString("hex")}'`,
        );

        // Generate key
        const key = generateKey(values.password, srpSalt);
        console.log(`Generated key '${key.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

        // TODO: Add progress meter for connections
        console.debug("Handshake...");
        let clientPriv, clientPub, serverPub, handshakeUUID;
        for (let tryCount = 0; tryCount < 3; tryCount++) {
            let { priv, pub } = srpGroup.generateClientValues();
            const handshakeResponse = await handshake(apiURL, pub);
            if (!handshakeResponse.success) {
                console.debug(`Handshake failed: ${handshakeResponse.error} (try count: ${tryCount})`);
                continue;
            }

            clientPriv = priv;
            clientPub = pub;
            serverPub = handshakeResponse.serverPub; // FIXME: Validate response by server
            handshakeUUID = handshakeResponse.handshakeUUID;
            break;
        }
        if (!clientPriv || !clientPub || !serverPub || !handshakeUUID) {
            presentAlert({
                header: "Handshake Failed",
                message: "Could not complete handshake. Please try again.",
                buttons: ["OK"],
            });
            return;
        }

        console.debug("Calculating master...");
        const premaster = srpGroup.computePremasterSecret(
            clientPriv,
            serverPub,
            key,
            srpGroup.computeU(clientPub, serverPub),
        );
        const masterKey = srpGroup.premasterToMaster(premaster); // Key used to encrypt communications
        console.log("Master key: " + masterKey.toString("hex"));

        console.debug("Verifying M1...");
        const m1 = srpGroup.generateM1(srpSalt, clientPub, serverPub, masterKey);
        const validityResponse = await checkValidity(apiURL, handshakeUUID, srpSalt, clientPub, serverPub, m1);
        if (!validityResponse.success) {
            presentAlert({
                header: "Client Verification Failed",
                message: `Server failed to verify client: ${validityResponse.error!}`,
                buttons: ["OK"],
            });
            return;
        }

        console.debug("Verifying M2...");
        const m2Server = validityResponse.m2!;
        const m2Client = srpGroup.generateM2(clientPub, m1, masterKey);
        if (!m2Client.equals(m2Server)) {
            presentAlert({
                header: "Server Verification Failed",
                message: "Client failed to verify server.",
                buttons: ["OK"],
            });
            return;
        }

        console.debug("Retrieving token...");
        // TODO: Continue with token retrieval

        presentAlert({
            header: "Connected",
            buttons: ["OK"],
        });
    }

    // Render
    return (
        <IonPage>
            <IonContent class="w-full">
                <div className="mx-auto flex w-4/5 flex-col pt-4">
                    <h1>Login</h1>
                    <form>
                        <div className="grid auto-rows-fr grid-rows-2 gap-4 *:h-18">
                            <div>
                                <URLInput label="Server URL" value="http://localhost:8000/" />{" "}
                                {/* TODO: Remove value */}
                            </div>
                            <div>
                                {/* TODO: Remove default value */}
                                <IonInput
                                    label="Password"
                                    labelPlacement="stacked"
                                    fill="solid"
                                    type="password"
                                    value="Password"
                                >
                                    <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                                </IonInput>
                            </div>
                        </div>

                        <IonButton className="mx-auto pt-2" onClick={onLoginButtonClick}>
                            Log In
                        </IonButton>
                    </form>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;
