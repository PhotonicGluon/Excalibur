import React from "react";

import { IonContent, IonPage } from "@ionic/react";

const TestPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
