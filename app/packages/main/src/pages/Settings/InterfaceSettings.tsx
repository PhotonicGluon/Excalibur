import {
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonLabel,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import {
    FileSizeUnits,
    IconStyle,
    RowAlternatingColours,
    SettingsPreferenceValues,
    Theme,
} from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const InterfaceSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const settings = useSettings();

    // Functions
    /**
     * Handles any updates to the settings' values.
     */
    function updateSettings() {
        // Get final data
        const theme = (document.getElementById("theme")! as HTMLIonSelectElement).value as Theme;
        const iconStyle = (document.getElementById("icon-style")! as HTMLIonSelectElement).value as IconStyle;
        const rowAlternatingColours = (document.getElementById("row-alternating-colours")! as HTMLIonSelectElement)
            .value as RowAlternatingColours;
        const fileSizeUnits = (document.getElementById("file-size-units")! as HTMLIonSelectElement)
            .value as FileSizeUnits;

        // Form new settings
        const newSettings: Partial<SettingsPreferenceValues> = {
            theme,
            iconStyle,
            rowAlternatingColours,
            fileSizeUnits,
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
                    <IonTitle>Interface Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
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
                                    updateSettings();
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
                                    updateSettings();
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
                                    updateSettings();
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
                                    updateSettings();
                                }}
                            >
                                <IonSelectOption value="si">kB, MB, GB</IonSelectOption>
                                <IonSelectOption value="iec">KiB, MiB, GiB</IonSelectOption>
                            </IonSelect>
                        }
                    ></SettingsItem>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default InterfaceSettings;
