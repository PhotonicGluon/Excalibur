import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";

const Credits: React.FC = () => {
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="ion-padding-top flex">
                    <IonButtons slot="start">
                        <IonBackButton></IonBackButton>
                    </IonButtons>
                    <IonTitle>Credits</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                <IonText>TODO: Add credits</IonText>
            </IonContent>
        </IonPage>
    );
};

export default Credits;
