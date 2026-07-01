import { useState } from "react";

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

    // States
    const [theme, setTheme] = useState<Theme>(settings.theme);
    const [iconStyle, setIconStyle] = useState<IconStyle>(settings.iconStyle);
    const [rowAlternatingColours, setRowAlternatingColours] = useState<RowAlternatingColours>(
        settings.rowAlternatingColours,
    );
    const [fileSizeUnits, setFileSizeUnits] = useState<FileSizeUnits>(settings.fileSizeUnits);

    // Functions
    /**
     * Handles any updates to the settings' values.
     *
     * @param newSettings the new settings' values
     */
    function updateSettings(newSettings: SettingsPreferenceValues) {
        const settingsToSave: Partial<SettingsPreferenceValues> = {
            theme: newSettings.theme,
            iconStyle: newSettings.iconStyle,
            rowAlternatingColours: newSettings.rowAlternatingColours,
            fileSizeUnits: newSettings.fileSizeUnits,
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
                    <IonTitle>Interface Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal">
                    <SettingsItem
                        label={<IonLabel>Theme</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select theme"
                                value={theme}
                                onIonChange={(e) => {
                                    const newTheme = e.detail.value as Theme;
                                    setTheme(newTheme);
                                    updateSettings({ ...settings, theme: newTheme });
                                }}
                            >
                                <IonSelectOption value="system">System</IonSelectOption>
                                <IonSelectOption value="light">Light</IonSelectOption>
                                <IonSelectOption value="dark">Dark</IonSelectOption>
                            </IonSelect>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Icon Style</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select icon style"
                                value={iconStyle}
                                onIonChange={(e) => {
                                    const newIconStyle = e.detail.value as IconStyle;
                                    setIconStyle(newIconStyle);
                                    updateSettings({ ...settings, iconStyle: newIconStyle });
                                }}
                            >
                                <IonSelectOption value="default">Default</IonSelectOption>
                                <IonSelectOption value="reversed">Reversed Default</IonSelectOption>
                                <IonSelectOption value="outline">All Outlined</IonSelectOption>
                                <IonSelectOption value="solid">All Solid</IonSelectOption>
                            </IonSelect>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Row Highlight</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select highlight colours"
                                value={rowAlternatingColours}
                                onIonChange={(e) => {
                                    const newRowAlternatingColours = e.detail.value as RowAlternatingColours;
                                    setRowAlternatingColours(newRowAlternatingColours);
                                    updateSettings({ ...settings, rowAlternatingColours: newRowAlternatingColours });
                                }}
                            >
                                <IonSelectOption value="off">Off</IonSelectOption>
                                <IonSelectOption value="normal">Normal</IonSelectOption>
                                <IonSelectOption value="inverted">Inverted</IonSelectOption>
                            </IonSelect>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>File Size Units</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select file size units"
                                value={fileSizeUnits}
                                onIonChange={(e) => {
                                    const newFileSizeUnits = e.detail.value as FileSizeUnits;
                                    setFileSizeUnits(newFileSizeUnits);
                                    updateSettings({ ...settings, fileSizeUnits: newFileSizeUnits });
                                }}
                            >
                                <IonSelectOption value="si">kB, MB, GB</IonSelectOption>
                                <IonSelectOption value="iec">KiB, MiB, GiB</IonSelectOption>
                            </IonSelect>
                        }
                    />
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default InterfaceSettings;
