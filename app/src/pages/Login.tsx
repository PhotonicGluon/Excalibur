import { IonContent, IonPage, IonInput, IonInputPasswordToggle, IonButton, useIonAlert } from "@ionic/react";

import URLInput from "@components/inputs/URLInput";
import { validateURL } from "@lib/validators";
import { checkConnection } from "@lib/network";

const Login: React.FC = () => {
    // States
    const [presentAlert] = useIonAlert();

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

        // Check connectivity to the server
        // FIXME: Check connectivity
        if (!(await checkConnection(values.server))) {
            presentAlert({
                header: "Connection Failure",
                message: `Could not connect to ${values.server}.`,
                buttons: ["OK"],
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
                    <div className="grid auto-rows-fr grid-rows-2 gap-4 *:h-18">
                        <div>
                            <URLInput label="Server URL" value="http://localhost:8000/" /> {/* TODO: Remove */}
                        </div>
                        <div>
                            <IonInput label="Password" labelPlacement="stacked" fill="solid" type="password">
                                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                            </IonInput>
                        </div>
                    </div>

                    <IonButton className="mx-auto pt-2" onClick={onLoginButtonClick}>
                        Log In
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;
