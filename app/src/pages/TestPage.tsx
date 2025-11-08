import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import CircularProgressBar from "@components/CircularProgressBar";

const TestPage: React.FC = () => {
    const percentage = 0.4;
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Circular Progress Bars</h1>
                <CircularProgressBar className="size-20" value={percentage} transitionDuration={0.5} />
                <CircularProgressBar className="size-20" value={null} transitionDuration={0.5} />
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
