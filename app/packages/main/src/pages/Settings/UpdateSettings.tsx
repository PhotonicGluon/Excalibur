import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { performUpdateCheck } from "@lib/check-update";
import { DEFAULT_SETTINGS_VALUES, SettingsPreferenceValues } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const UpdateSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const settings = useSettings();

    const [presentAlert] = useIonAlert();

    // States
    const [checkUpdate, setCheckUpdate] = useState<boolean>(settings.checkUpdate);
    const [checkUpdateInterval, setCheckUpdateInterval] = useState<number>(settings.checkUpdateInterval);

    // Functions
    /**
     * Handles any updates to the settings' values.
     *
     * @param newSettings the new settings' values
     */
    function updateSettings(newSettings: SettingsPreferenceValues) {
        // Validation
        if (isNaN(newSettings.checkUpdateInterval)) {
            newSettings.checkUpdateInterval = DEFAULT_SETTINGS_VALUES.checkUpdateInterval;
            setCheckUpdateInterval(DEFAULT_SETTINGS_VALUES.checkUpdateInterval);
        }

        // Form new settings
        const settingsToSave: Partial<SettingsPreferenceValues> = {
            checkUpdate: newSettings.checkUpdate,
            checkUpdateInterval: newSettings.checkUpdateInterval,
        };

        console.log(`Got new settings' values: ${JSON.stringify(settingsToSave)}`);
        settings.change(settingsToSave);
        settings.save(settingsToSave);
    }

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
                    <IonTitle>Update Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal">
                    <SettingsItem
                        label={<IonLabel>Check for Updates?</IonLabel>}
                        input={
                            <IonToggle
                                checked={checkUpdate}
                                onIonChange={(e) => {
                                    const newCheckUpdate = e.detail.checked;
                                    setCheckUpdate(newCheckUpdate);
                                    updateSettings({ ...settings, checkUpdate: newCheckUpdate });
                                }}
                            ></IonToggle>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Update Check Interval</IonLabel>}
                        input={
                            <IonInput
                                fill="outline"
                                type="number"
                                helperText="In hours"
                                value={checkUpdateInterval}
                                onIonChange={(e) => {
                                    const newCheckUpdateInterval = parseInt(
                                        e.detail.value ?? DEFAULT_SETTINGS_VALUES.checkUpdateInterval.toString(),
                                    );
                                    setCheckUpdateInterval(newCheckUpdateInterval);
                                    updateSettings({ ...settings, checkUpdateInterval: newCheckUpdateInterval });
                                }}
                            ></IonInput>
                        }
                    />
                    <SettingsItem
                        label={<></>}
                        input={
                            <IonButton
                                onClick={async () => {
                                    const updateAvailable = await performUpdateCheck(presentAlert, true);
                                    if (!updateAvailable) {
                                        presentAlert({
                                            header: "No Update Available",
                                            message: "You are on the latest version of Excalibur.",
                                            buttons: [
                                                {
                                                    text: "OK",
                                                    role: "cancel",
                                                },
                                            ],
                                        });
                                    }
                                }}
                            >
                                Check for Update Now
                            </IonButton>
                        }
                    />
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default UpdateSettings;
