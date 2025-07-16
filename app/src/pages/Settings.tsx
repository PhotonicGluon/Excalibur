import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";

const Settings: React.FC = () => {
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="ion-padding-top flex">
                    <IonButtons slot="start">
                        <IonBackButton></IonBackButton>
                    </IonButtons>
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Settings</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonText>Settings</IonText>
            </IonContent>
        </IonPage>
    );
};

export default Settings;
