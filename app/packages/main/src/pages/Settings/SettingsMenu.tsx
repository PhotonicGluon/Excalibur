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

const SettingsMenu: React.FC<RouteComponentProps> = () => {
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
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                <IonList className="mt-2 rounded-lg bg-transparent pt-0 *:[--background:var(--ion-background-color)]">
                    <IonItem id="settings-interface" routerLink="/settings/interface" routerDirection="forward">
                        <IonLabel>
                            <h2>Interface</h2>
                            <p>Change how the interface of Excalibur looks and behaves.</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem id="settings-crypto" routerLink="/settings/operations" routerDirection="forward">
                        <IonLabel>
                            <h2>Operations</h2>
                            <p>Modify how Excalibur performs operations.</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem id="settings-update" routerLink="/settings/update" routerDirection="forward">
                        <IonLabel>
                            <h2>Update</h2>
                            <p>Modify how Excalibur checks for updates.</p>
                        </IonLabel>
                    </IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default SettingsMenu;
