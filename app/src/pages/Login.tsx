import {
    IonContent,
    IonPage,
    IonInput,
    IonInputPasswordToggle,
    IonButton,
    useIonAlert,
    useIonToast,
} from "@ionic/react";

import URLInput from "@components/inputs/URLInput";
import { validateURL } from "@lib/validators";
import { checkConnection } from "@lib/network";
import { generateKey } from "@lib/security/keygen";
import { checkVerifier } from "@lib/security/verifier";
import { getGroup, setUpVerifier } from "@lib/security/auth";

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
        const { group: srpGroup, error } = await getGroup(apiURL);
        if (!srpGroup) {
            presentToast({
                message: `Unable to determine server's SRP group: ${error}`,
                duration: 3000,
            });
            return;
        }

        console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

        // Generate the key
        const key = generateKey(values.password);
        console.log(`Generated key: ${key.toString("hex")}`);

        // Check whether verifier has been set up
        if (!(await checkVerifier(apiURL))) {
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
                            // Set up verifier
                            const verifier = srpGroup.generateVerifier(key);
                            console.debug(`Generated verifier: ${verifier.toString(16)}`);
                            await setUpVerifier(apiURL, verifier);
                            console.debug("Verifier set up");
                            presentToast({
                                message: "Verifier set up. Please log in again.",
                                duration: 5000,
                            });
                        },
                    },
                ],
            });
            return;
        }

        // TODO: Continue
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
