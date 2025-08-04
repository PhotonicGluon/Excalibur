import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonLabel,
    IonPage,
    IonRow,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { CryptoChunkSize, FileSizeUnits, SettingsPreferenceValues, Theme } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@contexts/settings";

const Settings: React.FC = () => {
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const settings = useSettings();

    // States
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialSettings] = useState<SettingsPreferenceValues>(settings);

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
                            // Revert settings back
                            console.log(`Initial settings: ${JSON.stringify(initialSettings)}`);
                            settings.change(initialSettings);

                            // Go back
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

        // Get final data
        const theme = (document.getElementById("theme")! as HTMLIonSelectElement).value as Theme;
        const cryptoChunkSize = parseInt(
            (document.getElementById("crypto-chunk-size")! as HTMLIonSelectElement).value,
        ) as CryptoChunkSize;
        const fileSizeUnits = (document.getElementById("file-size-units")! as HTMLIonSelectElement)
            .value as FileSizeUnits;

        const newSettings: SettingsPreferenceValues = {
            theme,
            cryptoChunkSize,
            fileSizeUnits,
        };
        console.log(`Got new settings' values: ${JSON.stringify(newSettings)}`);
        settings.save(newSettings);

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
                <IonGrid className="ion-padding-horizontal -mt-2 [&_h2]:!mt-4 [&_h2]:!text-lg [&_h2]:!leading-none [&_h2]:!font-bold">
                    {/* Interface */}
                    <IonRow>
                        <IonCol>
                            <IonLabel>
                                <h2>Interface</h2>
                                <p>Settings that affect the interface of Excalibur.</p>
                            </IonLabel>
                        </IonCol>
                    </IonRow>
                    <SettingsItem
                        label={<IonLabel>Theme</IonLabel>}
                        input={
                            <IonSelect
                                id="theme"
                                interface="popover"
                                fill="outline"
                                placeholder="Select theme"
                                value={settings.theme}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        theme: e.detail.value as Theme,
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <IonSelectOption value="system">System</IonSelectOption>
                                <IonSelectOption value="light">Light</IonSelectOption>
                                <IonSelectOption value="dark">Dark</IonSelectOption>
                            </IonSelect>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>File Size Units</IonLabel>}
                        input={
                            <IonSelect
                                id="file-size-units"
                                interface="popover"
                                fill="outline"
                                placeholder="Select file size units"
                                value={settings.fileSizeUnits}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        fileSizeUnits: e.detail.value as FileSizeUnits,
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <IonSelectOption value="si">kB, MB, GB</IonSelectOption>
                                <IonSelectOption value="iec">KiB, MiB, GiB</IonSelectOption>
                            </IonSelect>
                        }
                    />

                    {/* Operations */}
                    <IonRow>
                        <IonCol>
                            <IonLabel>
                                <h2>Operations</h2>
                                <p>Affects the operations of Excalibur.</p>
                            </IonLabel>
                        </IonCol>
                    </IonRow>
                    <SettingsItem
                        label={<IonLabel>Crypto Chunk Size</IonLabel>}
                        input={
                            <IonSelect
                                id="crypto-chunk-size"
                                interface="popover"
                                fill="outline"
                                placeholder="Select chunk size"
                                value={settings.cryptoChunkSize.toString()}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        cryptoChunkSize: parseInt(e.detail.value) as CryptoChunkSize,
                                    });
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
                </IonGrid>

                {/* Save button */}
                <IonButton
                    expand="block"
                    className="ion-padding-horizontal"
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
