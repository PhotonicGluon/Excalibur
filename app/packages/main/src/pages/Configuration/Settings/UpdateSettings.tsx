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

    // Functions
    /**
     * Handles any updates to the settings' values.
     */
    function updateSettings() {
        // Get final data
        const checkUpdate = (document.getElementById("check-update")! as HTMLIonCheckboxElement).checked;
        let checkUpdateInterval = parseInt(
            (document.getElementById("check-update-interval")! as HTMLInputElement).value,
        ) as number;

        // Validation
        if (isNaN(checkUpdateInterval)) {
            checkUpdateInterval = DEFAULT_SETTINGS_VALUES.checkUpdateInterval;
        }

        // Form new settings
        const newSettings: Partial<SettingsPreferenceValues> = {
            checkUpdate,
            checkUpdateInterval,
        };
        console.log(`Got new settings' values: ${JSON.stringify(newSettings)}`);
        settings.save(newSettings);
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
                <IonGrid className="ion-padding-horizontal [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
                    <SettingsItem
                        label={<IonLabel>Check for Updates?</IonLabel>}
                        input={
                            <IonToggle
                                id="check-update"
                                checked={settings.checkUpdate}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        checkUpdate: e.detail.checked,
                                    });
                                    updateSettings();
                                }}
                            ></IonToggle>
                        }
                    ></SettingsItem>
                    <SettingsItem
                        label={<IonLabel>Update Check Interval</IonLabel>}
                        input={
                            <IonInput
                                id="check-update-interval"
                                type="number"
                                helperText="In hours"
                                value={settings.checkUpdateInterval}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        checkUpdateInterval: parseInt(
                                            e.detail.value ?? DEFAULT_SETTINGS_VALUES.checkUpdateInterval.toString(),
                                        ),
                                    });
                                    updateSettings();
                                }}
                            ></IonInput>
                        }
                    ></SettingsItem>
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
                    ></SettingsItem>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default UpdateSettings;
