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

import { useAuth } from "@components/auth/context";

const SettingsMenu: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const auth = useAuth();

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
                    <IonItem routerLink="/settings/interface" routerDirection="forward">
                        <IonLabel>
                            <h2>Interface</h2>
                            <p>Affects the interface of Excalibur.</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem routerLink="/settings/crypto" routerDirection="forward">
                        <IonLabel>
                            <h2>Crypto</h2>
                            <p>Affects the cryptographic operations of Excalibur.</p>
                        </IonLabel>
                    </IonItem>
                    <IonItem routerLink="/settings/update" routerDirection="forward">
                        <IonLabel>
                            <h2>Update</h2>
                            <p>Affects the update functionality of Excalibur.</p>
                        </IonLabel>
                    </IonItem>

                    <IonItem routerLink="/settings/server" routerDirection="forward" disabled={!auth.getToken()}>
                        <IonLabel>
                            <h2>Server</h2>
                            <p>Affects the server functionality of Excalibur.</p>
                        </IonLabel>
                    </IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default SettingsMenu;
