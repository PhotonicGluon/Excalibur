import {
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonPage,
    IonText,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack, copyOutline } from "ionicons/icons";

import { toMnemonic } from "@lib/auth/bip39";

import { useAuth } from "@components/auth/context";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";

const ServerSettings: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const auth = useAuth();
    // const settings = useSettings();

    // Functions
    // /**
    //  * Handles any updates to the settings' values.
    //  */
    // function updateSettings() {
    //     // Nothing to update... for now
    // }

    // Render
    const localVaultKeyMnemonic = auth.vaultKey ? toMnemonic(auth.vaultKey) : undefined;
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
                    <IonTitle>Server Settings</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
                    {/* Vault key */}
                    <h2 className="m-0">Vault Key</h2>
                    <div className="overflow-y-scroll">
                        <IonText className="text-justify" color="danger">
                            <p className="text-sm leading-none md:text-base">
                                <span className="font-bold">Warning</span>: this vault key is used to encrypt and
                                decrypt all data stored in the vault. It is critical to keep this key secret.
                            </p>
                        </IonText>
                        <details className="ion-margin-top" style={{ outline: "none" }}>
                            <summary className="ion-text-wrap" style={{ cursor: "pointer", userSelect: "none" }}>
                                Reveal vault key
                            </summary>
                            <div className="ion-padding-start ion-padding-end mt-1 flex gap-1">
                                <IonText className="text-justify" color="warning">
                                    <p className="m-0 flex h-12 items-center text-sm leading-none md:text-base">
                                        Consider saving a copy of the vault key, storing it in a secure location.
                                    </p>
                                </IonText>
                                <IonButton
                                    className="m-0 size-12"
                                    style={{ "--color": "none" }}
                                    fill="clear"
                                    onClick={() =>
                                        navigator.clipboard.writeText(
                                            localVaultKeyMnemonic ? localVaultKeyMnemonic.join(" ") : "",
                                        )
                                    }
                                >
                                    <IonIcon slot="icon-only" icon={copyOutline} />
                                </IonButton>
                            </div>

                            <BIP39MnemonicInput
                                numWords={24}
                                initialWords={localVaultKeyMnemonic}
                                maxSuggestions={5}
                                onEntropy={() => {}}
                                onError={() => {}}
                                disabled={true}
                            />
                        </details>
                    </div>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default ServerSettings;
