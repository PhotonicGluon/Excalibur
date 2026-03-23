import React from "react";

import { IonButton, IonContent, IonPage } from "@ionic/react";

import { e2eeOPAQUE } from "@lib/auth/e2ee";

const TestPage: React.FC = () => {
    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <IonButton
                    onClick={() => {
                        e2eeOPAQUE(
                            "http://localhost:8888/api",
                            "test-user-opaque",
                            "Password",
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
