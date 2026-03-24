import React from "react";

import { IonButton, IonContent, IonInput, IonPage } from "@ionic/react";

import { e2eeOPAQUE } from "@lib/auth/e2ee";

const TestPage: React.FC = () => {
    // States
    const [password, setPassword] = React.useState("Password");

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <IonInput
                    value={password}
                    onIonChange={(e) => setPassword(e.detail.value!)}
                    placeholder="Password"
                ></IonInput>
                <IonButton
                    onClick={() => {
                        e2eeOPAQUE(
                            "http://localhost:8888/api",
                            "test-user-opaque",
                            password,
                            undefined,
                            (message) => console.log("Set loading state: " + message),
                            (header, subheader, message) =>
                                console.log("Show alert: " + header + " " + subheader + " " + message),
                        ).then((result) => {
                            console.log(result);
                        });
                    }}
                >
                    Test OPAQUE Protocol
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
