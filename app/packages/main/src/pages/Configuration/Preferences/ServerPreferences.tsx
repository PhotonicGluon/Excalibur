import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonLabel,
    IonLoading,
    IonPage,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack, copyOutline } from "ionicons/icons";

import { toMnemonic } from "@lib/auth/bip39";
import { toggleObfuscationForAllFiles } from "@lib/files/obfuscation";
import { editAdditionalUserInfo } from "@lib/users/api";
import { AdditionalUserInfo } from "@lib/users/structures";

import { useAuth } from "@components/auth/context";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";
import SettingsItem from "@components/settings/SettingsItem";

const ServerPreferences: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const auth = useAuth();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // States
    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Processing...");

    // Functions
    /**
     * Toggles the use of obfuscation for all files.
     */
    async function toggleUseObfuscation() {
        const newObfuscation = !auth.authInfo!.obfuscatedNames;

        setIsLoading(true);
        setLoadingState("Processing...");

        try {
            await toggleObfuscationForAllFiles(auth, newObfuscation, setLoadingState);
        } catch (error) {
            console.error(error);
            presentToast({
                message: `An error occurred: ${error}`,
                duration: 2000,
                color: "danger",
            });
            setIsLoading(false);
            return;
        }

        // Toggle obfuscation state
        const additionalInfo: AdditionalUserInfo = {
            obfuscatedNames: newObfuscation,
        };

        const setAdditionalInfoResponse = await editAdditionalUserInfo(
            auth.serverInfo!.apiURL!,
            auth.getToken()!,
            auth.authInfo!.key,
            additionalInfo,
        );
        if (!setAdditionalInfoResponse.success) {
            console.error(`Could not update user additional info: ${setAdditionalInfoResponse.error}`);
            setIsLoading(false);
            presentAlert({
                header: "Update Failure",
                message: `Could not update user additional info: ${setAdditionalInfoResponse.error}`,
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Set user additional info: ${JSON.stringify(additionalInfo)}`);

        auth.setAuthInfo({
            ...auth.authInfo!,
            token: auth.getToken()!,
            obfuscatedNames: newObfuscation,
        });

        // Report success
        console.log(`Using obfuscation: ${newObfuscation}`);
        presentToast({
            message: `Obfuscation successfully ${newObfuscation ? "enabled" : "disabled"}`,
            duration: 2000,
            color: "success",
        });
        setIsLoading(false);
    }

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
                    <IonTitle>Server Preferences</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal mt-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:leading-none [&_h2]:font-bold">
                    <SettingsItem
                        label={<IonLabel className="text-base">Obfuscated Names</IonLabel>}
                        input={
                            <IonToggle
                                id="use-obfuscated-names"
                                checked={auth.authInfo!.obfuscatedNames}
                                onIonChange={() => {
                                    presentAlert({
                                        header: "Warning",
                                        message:
                                            "This will affect all files on the server. Are you sure you want to continue?",
                                        buttons: [
                                            {
                                                text: "Cancel",
                                                role: "cancel",
                                                handler: () => {
                                                    document.getElementById("use-obfuscated-names")!.setAttribute(
                                                        "checked",
                                                        auth.authInfo!.obfuscatedNames.toString(), // Set back to what it is currently
                                                    );
                                                },
                                            },
                                            {
                                                text: "Continue",
                                                role: "confirm",
                                                handler: toggleUseObfuscation,
                                            },
                                        ],
                                    });
                                }}
                            ></IonToggle>
                        }
                    ></SettingsItem>
                    <hr />
                </IonGrid>

                {/* Vault key */}
                <div className="ion-padding-horizontal">
                    <h2 className="m-0">Vault Key</h2>
                    <IonText className="text-justify" color="danger">
                        <p className="text-sm leading-none md:text-base">
                            <span className="font-bold">Warning</span>: this vault key is used to encrypt and decrypt
                            all data stored in the vault. It is critical to keep this key secret.
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

                {/* Loading indicator */}
                <IonLoading
                    className="[&_.loading-wrapper]:w-full [&_.loading-wrapper_.loading-content]:w-full"
                    isOpen={isLoading}
                    message={loadingState}
                ></IonLoading>
            </IonContent>
        </IonPage>
    );
};

export default ServerPreferences;
