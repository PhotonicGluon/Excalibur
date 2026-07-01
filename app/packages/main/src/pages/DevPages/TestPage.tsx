import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import PasswordInput from "@components/inputs/PasswordInput";

const TestPage: React.FC = () => {
    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>

                <hr />
                <h2>Single-Password</h2>
                <PasswordInput onPasswordChange={(password) => console.log("Single-Password:", password)} />

                <hr />
                <h2>Double-Password</h2>
                <PasswordInput
                    confirmation
                    onPasswordChange={(password) => console.log("Double-Password:", password)}
                />
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
