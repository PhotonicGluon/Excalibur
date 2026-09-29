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
import { TOAST_DURATION } from "@lib/consts";
import { toggleObfuscationForAllFiles } from "@lib/files/obfuscation";
import { verifyVaultIntegrity } from "@lib/merkle";
import { UserVaultInfo } from "@lib/users/structures";
import { timestampToDateString } from "@lib/util/date";

import { editVaultInfo } from "@api/users";

import { useAuth } from "@components/auth/context";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";
import { useMerkle } from "@components/merkle/context";
import SettingsItem from "@components/settings/SettingsItem";

const DataPreferences: React.FC = () => {
    // Contexts
    const router = useIonRouter();
    const auth = useAuth();
    const merkle = useMerkle();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // States
    const [toggledObfuscation, setToggledObfuscation] = useState(false);

    const [checkingIntegrity, setCheckingIntegrity] = useState(false);
    const [lastChecked, setLastChecked] = useState<number | null>(merkle.lastSyncedAt); // In seconds

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Processing...");

    // Functions
    /**
     * Toggles the use of obfuscation for all files.
     */
    async function toggleUseObfuscation() {
        const newObfuscation = !auth.vaultInfo!.info.obfuscatedNames;

        setToggledObfuscation(true);
        setIsLoading(true);
        setLoadingState("Processing...");

        try {
            await toggleObfuscationForAllFiles(auth, newObfuscation, setLoadingState);
        } catch (error) {
            console.error(error);
            presentToast({
                message: `An error occurred: ${error}`,
                duration: TOAST_DURATION,
                color: "danger",
            });
            setIsLoading(false);
            return;
        }

        // Toggle obfuscation state
        const userVaultInfo: UserVaultInfo = {
            obfuscatedNames: newObfuscation,
        };

        const editVaultInfoResponse = await editVaultInfo(
            auth.serverInfo!.apiURL!,
            auth.getToken()!,
            auth.authInfo!.key,
            auth.vaultInfo!.keygenAlgorithm,
            userVaultInfo,
        );
        if (!editVaultInfoResponse.success) {
            console.error(`Could not update user vault info: ${editVaultInfoResponse.error}`);
            setIsLoading(false);
            presentAlert({
                header: "Update Failure",
                message: `Could not update user vault info: ${editVaultInfoResponse.error}`,
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Set user vault info: ${JSON.stringify(userVaultInfo)}`);

        auth.setVaultInfo({
            ...auth.vaultInfo!,
            info: userVaultInfo,
        });

        // Report success
        console.log(`Using obfuscation: ${newObfuscation}`);
        presentToast({
            message: `Obfuscation successfully ${newObfuscation ? "enabled" : "disabled"}`,
            duration: TOAST_DURATION,
            color: "success",
        });
        setIsLoading(false);
    }

    /**
     * Checks the integrity of the entire vault against its trusted, self-signed Merkle root.
     */
    async function checkDataIntegrity() {
        setCheckingIntegrity(true);
        try {
            const result = await verifyVaultIntegrity(auth);
            if (!result.success) {
                presentAlert({
                    header: "Could Not Check Integrity",
                    message: result.error,
                    buttons: ["OK"],
                });
                return;
            }

            setLastChecked(Date.now() / 1e3);
            if (result.verified) {
                presentToast({ message: "Vault verified; no tampering detected", duration: 2500, color: "success" });
            } else {
                presentAlert({
                    header: "Integrity Check Failed",
                    message:
                        result.details ??
                        "The vault's data does not match its trusted record. It may have been tampered with while stored on the server.",
                    buttons: ["OK"],
                });
            }
        } finally {
            setCheckingIntegrity(false);
        }
    }

    // Render
    const localVaultKeyMnemonic = auth.vaultInfo ? toMnemonic(auth.vaultInfo!.key) : undefined;
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
                    <IonButtons slot="start">
                        <IonButton
                            onClick={() => {
                                if (!toggledObfuscation) {
                                    router.goBack();
                                    return;
                                }

                                // Go back to the root file page
                                // (This is to avoid issues when a subfolder was selected before toggling obfuscation)
                                router.push("/files/", "back", "replace"); // Try to make it as seamless as possible
                            }}
                        >
                            <IonIcon className="size-6" slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Server Preferences</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal mt-2">
                    <SettingsItem
                        label={<IonLabel className="text-base">Obfuscated Names</IonLabel>}
                        input={
                            <IonToggle
                                id="use-obfuscated-names"
                                checked={auth.vaultInfo!.info.obfuscatedNames}
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
                                                        auth.vaultInfo!.info.obfuscatedNames!.toString(), // Set back to what it is currently
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
                            />
                        }
                    />
                    <hr />
                </IonGrid>

                {/* Data integrity */}
                <div className="ion-padding-horizontal">
                    <h2 className="m-0">Data Integrity</h2>
                    <IonText className="text-justify">
                        <p className="text-sm leading-none md:text-base">
                            Verify that your vault's data hasn't been tampered with while stored on the server.
                        </p>
                    </IonText>
                    <div className="ion-margin-top flex items-center gap-3">
                        <IonButton
                            disabled={merkle.status !== "active" || checkingIntegrity}
                            onClick={checkDataIntegrity}
                        >
                            {checkingIntegrity ? "Checking..." : "Check Now"}
                        </IonButton>
                        {merkle.status !== "active" && (
                            <IonText color="medium">
                                <p className="m-0 text-sm">Complete the vault security upgrade first.</p>
                            </IonText>
                        )}
                        {merkle.status === "active" && lastChecked && (
                            <IonText color="medium">
                                <p className="m-0 text-sm">Last checked {timestampToDateString(lastChecked)}</p>
                            </IonText>
                        )}
                    </div>
                </div>
                <IonGrid className="ion-padding-horizontal">
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
                            className="xl:grid-cols-4"
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

export default DataPreferences;
