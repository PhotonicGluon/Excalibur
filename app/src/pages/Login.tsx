import { randomBytes } from "crypto";
import { useState } from "react";

import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonLoading,
    IonPage,
    useIonAlert,
    useIonToast,
} from "@ionic/react";

import { checkConnection } from "@lib/network";
import { checkSecurityDetails, getGroup, getToken, setUpSecurityDetails } from "@lib/security/auth";
import { e2ee } from "@lib/security/e2ee";
import generateKey from "@lib/security/keygen";
import { validateURL } from "@lib/validators";

import URLInput from "@components/inputs/URLInput";

interface LoginValues {
    /** URL to the server */
    server: string;
    /** Password to the server */
    password: string;
}

const Login: React.FC = () => {
    // States
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Logging in...");

    // Functions
    function getAllValues(): LoginValues {
        // Get raw inputs
        const inputs = document.querySelectorAll("ion-input");

        // Preprocess
        let server = inputs[0].value! as string;
        server = server.replace(/\/$/, ""); // Remove trailing slash

        const password = inputs[1].value! as string;

        // Form values
        return { server: server, password: password };
    }

    function validateValues({ server, password }: LoginValues) {
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
        console.log("----- Login -----");

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

        // Show loading spinner
        setIsLoading(true);

        // Check connectivity to the server
        setLoadingState("Checking connectivity...");
        if (!(await checkConnection(values.server))) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                message: `Could not connect to ${values.server}.`,
                buttons: ["OK"],
            });
            return;
        }

        const apiURL = `${values.server}/api/v1`;

        // Check whether security details has been set up
        setLoadingState("Finding security details...");
        if (!(await checkSecurityDetails(apiURL))) {
            setIsLoading(false);
            presentAlert({
                header: "Security Details Not Set Up",
                message:
                    "Security details has not been set up. Would you like to set it up now with your entered password?",
                buttons: [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            console.debug("Security details setup cancelled.");
                            presentToast({
                                message: "Security details setup cancelled",
                                duration: 3000,
                            });
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: async () => {
                            // Get SRP group used for communication
                            setLoadingState("Determining SRP group...");
                            const groupResponse = await getGroup(apiURL);
                            const srpGroup = groupResponse.group;
                            if (!srpGroup) {
                                setIsLoading(false);
                                presentToast({
                                    message: `Unable to determine server's SRP group: ${groupResponse.error!}`,
                                    duration: 3000,
                                });
                                return;
                            }

                            console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

                            // Set up security details
                            const aukSalt = randomBytes(32);
                            const srpSalt = randomBytes(32);

                            console.debug(
                                `Created salts '${aukSalt.toString("hex")}' and '${srpSalt.toString("hex")}'`,
                            );
                            const key = await generateKey(values.password, srpSalt);
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

        // Set up End-to-End Encryption (E2EE)
        const e2eeResponse = await e2ee(
            apiURL,
            values.password,
            () => setIsLoading(false),
            setLoadingState,
            (header, msg) => {
                presentAlert({ header: header, message: msg, buttons: ["OK"] });
            },
            (msg) => {
                presentToast({ message: msg, duration: 3000 });
            },
        );
        if (!e2eeResponse) {
            // Errors already handled in `e2ee()`
            return;
        }
        const { uuid: handshakeUUID, key: masterKey } = e2eeResponse;

        // Get token for continued authentication
        setLoadingState("Retrieving token...");
        console.debug("Retrieving token...");
        const tokenResponse = await getToken(apiURL, handshakeUUID, masterKey);
        if (!tokenResponse.success) {
            setIsLoading(false);
            presentAlert({
                header: "Token Retrieval Failed",
                message: tokenResponse.error,
                buttons: ["OK"],
            });
            return;
        }
        const token = tokenResponse.token!;
        console.log(`Got token: ${token}`);

        // TODO: Continue with files retrieval
        setIsLoading(false);
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
                        <div className="flex flex-col gap-3">
                            <div className="h-18">
                                {/* TODO: Remove default value */}
                                <URLInput label="Server URL" value="http://localhost:8000/" />
                            </div>
                            <div className="h-18">
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

                        <IonButton className="mx-auto pt-4" onClick={onLoginButtonClick}>
                            Log In
                        </IonButton>
                    </form>
                </div>
                <IonLoading
                    className="[&_.loading-wrapper]:!w-full [&_.loading-wrapper_.loading-content]:!w-full"
                    isOpen={isLoading}
                    message={loadingState}
                ></IonLoading>
            </IonContent>
        </IonPage>
    );
};

export default Login;
