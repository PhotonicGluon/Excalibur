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
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { KeyStrength } from "@lib/crypto/exef";
import { CryptoChunkSizeExponent, FileReadChunkSize, SettingsPreferenceValues } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const OperationsSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const settings = useSettings();

    // States
    const [fileReadChunkSize, setFileReadChunkSize] = useState<FileReadChunkSize>(settings.fileReadChunkSize);
    const [cryptoKeyStrength, setCryptoKeyStrength] = useState<KeyStrength>(settings.cryptoKeyStrength);
    const [cryptoChunkSizeExponent, setCryptoChunkSizeExponent] = useState<CryptoChunkSizeExponent>(
        settings.cryptoChunkSizeExponent,
    );

    // Functions
    /**
     * Handles any updates to the settings' values.
     *
     * @param newSettings the new settings' values
     */
    function updateSettings(newSettings: SettingsPreferenceValues) {
        const settingsToSave: Partial<SettingsPreferenceValues> = {
            fileReadChunkSize: newSettings.fileReadChunkSize,
            cryptoKeyStrength: newSettings.cryptoKeyStrength,
            cryptoChunkSizeExponent: newSettings.cryptoChunkSizeExponent,
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
                    <IonTitle>Operations Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal">
                    {/* I/O */}
                    <IonRow>
                        <IonCol>
                            <IonLabel>
                                <h2 className="text-lg font-bold">Input/Output</h2>
                                <p>Affects the input/output operations of Excalibur.</p>
                            </IonLabel>
                        </IonCol>
                    </IonRow>
                    <SettingsItem
                        label={<IonLabel>File Read Chunk Size</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select chunk size"
                                value={fileReadChunkSize.toString()}
                                onIonChange={(e) => {
                                    const newFileReadChunkSize = parseInt(e.detail.value) as FileReadChunkSize;
                                    setFileReadChunkSize(newFileReadChunkSize);
                                    updateSettings({ ...settings, fileReadChunkSize: newFileReadChunkSize });
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
                    {/* Crypto */}
                    <IonRow>
                        <IonCol>
                            <IonLabel>
                                <h2 className="text-lg font-bold">Crypto</h2>
                                <p>Affects the cryptographic operations of Excalibur.</p>
                            </IonLabel>
                        </IonCol>
                    </IonRow>
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
                                value={cryptoChunkSizeExponent.toString()}
                                onIonChange={(e) => {
                                    const newCryptoChunkSizeExponent = parseInt(
                                        e.detail.value,
                                    ) as CryptoChunkSizeExponent;
                                    setCryptoChunkSizeExponent(newCryptoChunkSizeExponent);
                                    updateSettings({
                                        ...settings,
                                        cryptoChunkSizeExponent: newCryptoChunkSizeExponent,
                                    });
                                }}
                            >
                                <IonSelectOption value="14">16 KiB</IonSelectOption>
                                <IonSelectOption value="15">32 KiB</IonSelectOption>
                                <IonSelectOption value="16">64 KiB</IonSelectOption>
                                <IonSelectOption value="17">128 KiB</IonSelectOption>
                                <IonSelectOption value="18">256 KiB</IonSelectOption>
                                <IonSelectOption value="19">512 KiB</IonSelectOption>
                                <IonSelectOption value="20">1 MiB</IonSelectOption>
                                <IonSelectOption value="21">2 MiB</IonSelectOption>
                                <IonSelectOption value="22">4 MiB</IonSelectOption>
                            </IonSelect>
                        }
                    />
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default OperationsSettings;
