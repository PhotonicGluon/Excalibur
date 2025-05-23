import { useState } from "react";
import { IonContent, IonPage, IonInput, IonInputPasswordToggle, IonButton, IonAlert } from "@ionic/react";

import URLInput from "@components/inputs/URLInput";
import { validateURL } from "@lib/validators";

const Login: React.FC = () => {
    const [alertIsOpen, setAlertIsOpen] = useState(false);

    function getAllValues() {
        const inputs = document.querySelectorAll("ion-input");
        return { server: inputs[0].value! as string, password: inputs[1].value! as string };
    }

    function validateValues({ server, password }: { server: string; password: string }) {
        // Check all filled
        if (server === "" || password === "") {
            setAlertIsOpen(true);
            return;
        }

        // Check server URL
        if (!validateURL(server)) {
            setAlertIsOpen(true);
            return;
        }
    }

    function onLogIn() {
        const values = getAllValues();
        validateValues(values);

        // TODO: Continue
    }

    return (
        <IonPage>
            <IonContent class="w-full">
                <div className="mx-auto flex w-4/5 flex-col pt-4">
                    <h1>Login</h1>
                    <div className="grid auto-rows-fr grid-rows-2 gap-4 *:h-18">
                        <div>
                            <URLInput label="Server URL" />
                        </div>
                        <div>
                            <IonInput label="Password" labelPlacement="stacked" fill="solid" type="password">
                                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                            </IonInput>
                        </div>
                    </div>

                    <IonButton className="mx-auto pt-2" onClick={onLogIn}>
                        Log In
                    </IonButton>
                </div>

                <IonAlert
                    isOpen={alertIsOpen}
                    header="Invalid Values"
                    message="Not all values are filled in or valid."
                    buttons={["Dismiss"]}
                    onDidDismiss={() => setAlertIsOpen(false)}
                ></IonAlert>
            </IonContent>
        </IonPage>
    );
};

export default Login;
