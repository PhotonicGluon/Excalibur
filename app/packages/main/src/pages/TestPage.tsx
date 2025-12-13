import React from "react";
import { Redirect } from "react-router";

import { IonButton, IonContent, IonPage } from "@ionic/react";

import { checkForUpdate } from "@lib/check-update";

const TestPage: React.FC = () => {
    if (process.env.NODE_ENV !== "development") {
        return <Redirect from={location.pathname} to="/" />;
    }

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <IonButton onClick={async () => console.log(await checkForUpdate())}>Check Update</IonButton>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
