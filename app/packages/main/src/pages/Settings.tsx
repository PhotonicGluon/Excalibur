import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
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

import {
    CryptoChunkSize,
    DEFAULT_SETTINGS_VALUES,
    FileSizeUnits,
    IconStyle,
    RowAlternatingColours,
    SettingsPreferenceValues,
    Theme,
} from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const Settings: React.FC = () => {
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const settings = useSettings();

    // States
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialSettings] = useState<SettingsPreferenceValues>(settings);

    // Functions
    /**
     * Handles the action upon back button click.
     */
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
        const iconStyle = (document.getElementById("icon-style")! as HTMLIonSelectElement).value as IconStyle;
        const rowAlternatingColours = (document.getElementById("row-alternating-colours")! as HTMLIonSelectElement)
            .value as RowAlternatingColours;
        const fileSizeUnits = (document.getElementById("file-size-units")! as HTMLIonSelectElement)
            .value as FileSizeUnits;
        const cryptoChunkSize = parseInt(
            (document.getElementById("crypto-chunk-size")! as HTMLIonSelectElement).value,
        ) as CryptoChunkSize;
        const checkUpdate = (document.getElementById("check-update")! as HTMLIonCheckboxElement).checked;
        let checkUpdateInterval = parseInt(
            (document.getElementById("check-update-interval")! as HTMLInputElement).value,
        ) as number;

        // Validation
        if (isNaN(checkUpdateInterval)) {
            checkUpdateInterval = DEFAULT_SETTINGS_VALUES.checkUpdateInterval;
        }

        // Form new settings
        const newSettings: SettingsPreferenceValues = {
            theme,
            iconStyle,
            rowAlternatingColours,
            fileSizeUnits,
            cryptoChunkSize,
            checkUpdate,
            checkUpdateInterval,
        };
        console.log(`Got new settings' values: ${JSON.stringify(newSettings)}`);
        settings.save(newSettings);

        // Report success
        setHasUnsavedChanges(false);
        console.debug("Settings saved successfully");
        presentToast({
            message: "Settings saved successfully",
            duration: 2000,
            color: "success",
        });
    }

    // Render
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
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
                <IonGrid className="ion-padding-horizontal -mt-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
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
                    ></SettingsItem>
                    <SettingsItem
                        label={<IonLabel>Icon Style</IonLabel>}
                        input={
                            <IonSelect
                                id="icon-style"
                                interface="popover"
                                fill="outline"
                                placeholder="Select icon style"
                                value={settings.iconStyle}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        iconStyle: e.detail.value as IconStyle,
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <IonSelectOption value="default">Default</IonSelectOption>
                                <IonSelectOption value="reversed">Reversed Default</IonSelectOption>
                                <IonSelectOption value="outline">All Outlined</IonSelectOption>
                                <IonSelectOption value="solid">All Solid</IonSelectOption>
                            </IonSelect>
                        }
                    ></SettingsItem>
                    <SettingsItem
                        label={<IonLabel>Row Highlight</IonLabel>}
                        input={
                            <IonSelect
                                id="row-alternating-colours"
                                interface="popover"
                                fill="outline"
                                placeholder="Select highlight colours"
                                value={settings.rowAlternatingColours}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        rowAlternatingColours: e.detail.value as RowAlternatingColours,
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <IonSelectOption value="off">Off</IonSelectOption>
                                <IonSelectOption value="normal">Normal</IonSelectOption>
                                <IonSelectOption value="inverted">Inverted</IonSelectOption>
                            </IonSelect>
                        }
                    ></SettingsItem>
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
                    ></SettingsItem>

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
                                <IonSelectOption value="65536">64 KiB</IonSelectOption>
                                <IonSelectOption value="131072">128 KiB</IonSelectOption>
                                <IonSelectOption value="262144">256 KiB</IonSelectOption>
                                <IonSelectOption value="524288">512 KiB</IonSelectOption>
                                <IonSelectOption value="1048576">1 MiB</IonSelectOption>
                                <IonSelectOption value="2097152">2 MiB</IonSelectOption>
                                <IonSelectOption value="4194304">4 MiB</IonSelectOption>
                            </IonSelect>
                        }
                    ></SettingsItem>

                    {/* Check for updates */}
                    <IonRow>
                        <IonCol>
                            <IonLabel>
                                <h2>Check for Updates</h2>
                                <p>Settings affecting the update functionality of Excalibur.</p>
                            </IonLabel>
                        </IonCol>
                    </IonRow>
                    <SettingsItem
                        label={<IonLabel>Check for Updates?</IonLabel>}
                        input={
                            <IonCheckbox
                                id="check-update"
                                checked={settings.checkUpdate}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        checkUpdate: e.detail.checked,
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                            ></IonCheckbox>
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
                                    setHasUnsavedChanges(true);
                                }}
                            ></IonInput>
                        }
                    ></SettingsItem>
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
