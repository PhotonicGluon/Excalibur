import React from "react";

import { IonContent, IonPage } from "@ionic/react";

const TestPage: React.FC = () => {
    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <hr />
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
