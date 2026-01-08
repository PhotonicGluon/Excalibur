import React from "react";
import { Redirect } from "react-router";

import { IonContent, IonPage } from "@ionic/react";

const TestPage: React.FC = () => {
    if (process.env.NODE_ENV !== "development") {
        return <Redirect from={location.pathname} to="/" />;
    }

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
