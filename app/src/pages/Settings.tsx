import {
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
    useIonToast,
} from "@ionic/react";

import SettingsItem from "@components/settings/SettingsItem";

const Settings: React.FC = () => {
    // Get router
    const [presentToast] = useIonToast();

    // Functions
    /**
     * Handles the saving of settings.
     */
    function onSaveSettings() {
        console.debug("Saving settings");

        presentToast({
            message: "Settings saved successfully",
            duration: 3000,
            color: "success",
        });
    }

    // Render
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

                {/* Settings list */}
                <IonList>
                    <SettingsItem
                        label={<IonLabel>Option 1</IonLabel>}
                        input={<IonInput type="text" placeholder="Enter text" />}
                    />
                    <SettingsItem
                        label={<IonLabel>Option 2</IonLabel>}
                        input={<IonInput type="email" placeholder="Enter email" />}
                    />
                </IonList>

                {/* Save button */}
                <IonButton expand="block" className="ion-padding" onClick={onSaveSettings}>
                    Save Settings
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default Settings;
