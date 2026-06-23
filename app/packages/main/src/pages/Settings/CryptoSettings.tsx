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

import { KeyStrength } from "@lib/crypto/exef";
import { CryptoChunkSize, SettingsPreferenceValues } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const CryptoSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const settings = useSettings();

    // States
    const [cryptoKeyStrength, setCryptoKeyStrength] = useState<KeyStrength>(settings.cryptoKeyStrength);
    const [cryptoChunkSize, setCryptoChunkSize] = useState<CryptoChunkSize>(settings.cryptoChunkSize);

    // Functions
    /**
     * Handles any updates to the settings' values.
     *
     * @param newSettings the new settings' values
     */
    function updateSettings(newSettings: SettingsPreferenceValues) {
        const settingsToSave: Partial<SettingsPreferenceValues> = {
            cryptoKeyStrength: newSettings.cryptoKeyStrength,
            cryptoChunkSize: newSettings.cryptoChunkSize,
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
                    <IonTitle>Crypto Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal">
                    <SettingsItem
                        label={<IonLabel>Key Strength</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select key strength"
                                value={cryptoKeyStrength.toString()}
                                onIonChange={(e) => {
                                    const newCryptoKeyStrength = parseInt(e.detail.value) as KeyStrength;
                                    setCryptoKeyStrength(newCryptoKeyStrength);
                                    updateSettings({ ...settings, cryptoKeyStrength: newCryptoKeyStrength });
                                }}
                            >
                                <IonSelectOption value="128">128 bits (Strong, Fastest)</IonSelectOption>
                                <IonSelectOption value="192">192 bits (Stronger, Faster)</IonSelectOption>
                                <IonSelectOption value="256">256 bits (Strongest, Fast)</IonSelectOption>
                            </IonSelect>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Chunk Size</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select chunk size"
                                value={cryptoChunkSize.toString()}
                                onIonChange={(e) => {
                                    const newCryptoChunkSize = parseInt(e.detail.value) as CryptoChunkSize;
                                    setCryptoChunkSize(newCryptoChunkSize);
                                    updateSettings({ ...settings, cryptoChunkSize: newCryptoChunkSize });
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
                    />
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default CryptoSettings;
