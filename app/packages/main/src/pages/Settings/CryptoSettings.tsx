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

import { KeyStrength } from "@lib/exef";
import { CryptoChunkSize, SettingsPreferenceValues } from "@lib/preferences/settings";

import SettingsItem from "@components/settings/SettingsItem";
import { useSettings } from "@components/settings/context";

const CryptoSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const settings = useSettings();

    // Functions
    /**
     * Handles any updates to the settings' values.
     */
    function updateSettings() {
        // Get final data
        const cryptoKeyStrength = parseInt(
            (document.getElementById("crypto-key-strength")! as HTMLIonSelectElement).value,
        ) as KeyStrength;
        const cryptoChunkSize = parseInt(
            (document.getElementById("crypto-chunk-size")! as HTMLIonSelectElement).value,
        ) as CryptoChunkSize;

        // Form new settings
        const newSettings: Partial<SettingsPreferenceValues> = {
            cryptoKeyStrength,
            cryptoChunkSize,
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
                    <IonTitle>Crypto Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
                    <SettingsItem
                        label={<IonLabel>Key Strength</IonLabel>}
                        input={
                            <IonSelect
                                id="crypto-key-strength"
                                interface="popover"
                                fill="outline"
                                placeholder="Select key strength"
                                value={settings.cryptoKeyStrength.toString()}
                                onIonChange={(e) => {
                                    settings.change({
                                        ...settings,
                                        cryptoKeyStrength: parseInt(e.detail.value) as KeyStrength,
                                    });
                                    updateSettings();
                                }}
                            >
                                <IonSelectOption value="128">128 bits (Strong, Fastest)</IonSelectOption>
                                <IonSelectOption value="192">192 bits (Stronger, Faster)</IonSelectOption>
                                <IonSelectOption value="256">256 bits (Strongest, Fast)</IonSelectOption>
                            </IonSelect>
                        }
                    ></SettingsItem>
                    <SettingsItem
                        label={<IonLabel>Chunk Size</IonLabel>}
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
                                    updateSettings();
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
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default CryptoSettings;
