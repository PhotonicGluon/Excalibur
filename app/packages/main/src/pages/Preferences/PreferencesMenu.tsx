import { RouteComponentProps } from "react-router";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

const PreferencesMenu: React.FC<RouteComponentProps> = () => {
    // Contexts
    const router = useIonRouter();

    // Render
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
                    <IonButtons slot="start">
                        <IonButton onClick={() => router.goBack()}>
                            <IonIcon className="size-6" slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Preferences</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                <IonList className="mt-2 rounded-lg bg-transparent pt-0 *:[--background:var(--ion-background-color)]">
                    <IonItem id="preferences-account" routerLink="/preferences/account" routerDirection="forward">
                        <IonLabel>
                            <h2>Account</h2>
                            <p>Configure account options.</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem id="preferences-data" routerLink="/preferences/data" routerDirection="forward">
                        <IonLabel>
                            <h2>Data</h2>
                            <p>Configure options for the data stored on the server.</p>
                        </IonLabel>
                    </IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default PreferencesMenu;
