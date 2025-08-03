import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonList,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { CryptoChunkSize } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@contexts/settings";

const Settings: React.FC = () => {
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const settings = useSettings();

    // States
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [encryptionChunkSize, setEncryptionChunkSize] = useState<CryptoChunkSize>(settings.cryptoChunkSize);

    // Functions
    function onBackButton() {
        if (hasUnsavedChanges) {
            presentAlert({
                header: "Unsaved Changes Found",
                message: "You have unsaved changes. Are you sure you want to leave?",
                buttons: [
                    {
                        text: "Cancel",
                        role: "cancel",
                    },
                    {
                        text: "Leave",
                        role: "destructive",
                        handler: () => {
                            router.goBack();
                        },
                    },
                ],
            });
        } else {
            router.goBack();
        }
    }

    /**
     * Handles the saving of settings.
     */
    function onSaveSettings() {
        console.debug("Saving settings...");

        // Update encryption chunk size
        const encryptionChunkSize = parseInt(
            (document.getElementById("crypto-chunk-size")! as HTMLIonSelectElement).value,
        ) as CryptoChunkSize;
        console.log(`Got new encryption chunk size: ${encryptionChunkSize}`);
        setEncryptionChunkSize(encryptionChunkSize);
        settings.save({ cryptoChunkSize: encryptionChunkSize });

        // Report success
        setHasUnsavedChanges(false);
        console.debug("Settings saved successfully");
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
                        <IonButton onClick={onBackButton}>
                            <IonIcon className="size-6" slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonList>
                    <SettingsItem
                        label={<IonLabel>Crypto Chunk Size</IonLabel>}
                        input={
                            <IonSelect
                                id="crypto-chunk-size"
                                interface="popover"
                                fill="outline"
                                placeholder="Select chunk size"
                                value={encryptionChunkSize.toString()}
                                onIonChange={(e) => {
                                    setEncryptionChunkSize(parseInt(e.detail.value) as CryptoChunkSize);
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <IonSelectOption value="32768">32 KiB</IonSelectOption>
                                <IonSelectOption value="65536">64 KiB</IonSelectOption>
                                <IonSelectOption value="131072">128 KiB</IonSelectOption>
                                <IonSelectOption value="262144">256 KiB</IonSelectOption>
                                <IonSelectOption value="524288">512 KiB</IonSelectOption>
                                <IonSelectOption value="1048576">1 MiB</IonSelectOption>
                            </IonSelect>
                        }
                    />
                </IonList>

                {/* Save button */}
                <IonButton
                    expand="block"
                    className="ion-padding"
                    onClick={onSaveSettings}
                    disabled={!hasUnsavedChanges}
                >
                    Save Settings
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default Settings;
