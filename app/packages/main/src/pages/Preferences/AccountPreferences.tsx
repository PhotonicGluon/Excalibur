import * as Comlink from "comlink";
import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonLabel,
    IonLoading,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { KeyGenFunction } from "@lib/crypto/keygen";
import { editRecord } from "@lib/users/api/edit-record";
import { VaultKeyGenerationProcessor } from "@lib/workers/generate-vault-keys";

import { useAuth } from "@components/auth/context";
import PasswordInput from "@components/inputs/PasswordInput";
import SettingsItem from "@components/settings/SettingsItem";

const AccountPreferences: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // States
    const [newUsername, setNewUsername] = useState<string>(auth.authInfo!.username!);
    const [newPassword, setNewPassword] = useState<string>("");
    const [keyGenFunction, setKeyGenFunction] = useState<KeyGenFunction>(auth.authInfo!.keygenFunction!);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Sending request...");

    // Functions
    /**
     * Handles any updates to the preferences' values.
     */
    async function updatePreferences() {
        // Process the new preferences
        const oldPref = {
            username: auth.authInfo!.username!,
            password: auth.authInfo!.password!,
            keygenFunction: auth.authInfo!.keygenFunction!,
        };

        const newPref = {
            username: newUsername ?? oldPref.username,
            password: newPassword && newPassword !== "" ? newPassword : oldPref.password,
            keygenFunction: keyGenFunction ?? oldPref.keygenFunction,
        };
        console.log(`Got new preferences' values: ${JSON.stringify(newPref)}`);

        if (JSON.stringify(newPref) === JSON.stringify(oldPref)) {
            presentToast({
                message: "No changes",
                duration: 2000,
                color: "warning",
            });
            return;
        }

        setIsLoading(true);

        // Regenerate AUK and encrypted vault key using a worker
        const worker = new Worker(new URL("@lib/workers/generate-vault-keys", import.meta.url), { type: "module" });
        const processor = Comlink.wrap<VaultKeyGenerationProcessor>(worker);

        let vaultKeysData;
        try {
            vaultKeysData = await processor.generateVaultKeys(
                newPref.password,
                { username: newPref.username },
                auth.vaultKey!,
                newPref.keygenFunction,
                // `proxy()` ensures the callback function works across threads
                Comlink.proxy((progress: number) => {
                    setLoadingState(`Creating new AUK and vault key (${Math.round(progress * 100)}%)`);
                }),
            );
        } finally {
            // Free up resources
            worker.terminate();
        }

        const {
            auk: { salt: newAUKSalt },
            vault: { encryptedKey: newEncryptedVaultKey },
        } = vaultKeysData;

        // Send edit request
        const response = await editRecord(
            auth,
            newPref.username,
            newPref.password,
            newPref.keygenFunction,
            newAUKSalt,
            newEncryptedVaultKey,
            () => setIsLoading(false),
            setLoadingState,
            (header, subheader, msg) => {
                presentAlert({ header: header, subHeader: subheader, message: msg, buttons: ["OK"] });
            },
        );
        if (!response.success) {
            const errorMsg = `Failed to update account: ${response.error}`;
            console.error(errorMsg);
            presentToast({
                message: errorMsg,
                duration: 2000,
                color: "danger",
            });
            setIsLoading(false);
            return;
        }

        auth.setAuthInfo({
            ...auth.authInfo!,
            token: auth.getToken()!,
            username: newPref.username,
            password: newPref.password,
            keygenFunction: newPref.keygenFunction,
        });

        presentToast({
            message: "Account updated successfully",
            duration: 2000,
            color: "success",
        });
        setIsLoading(false);
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
                    <IonTitle>Account Preferences</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Settings list */}
                <IonGrid className="ion-padding-horizontal mt-2">
                    <SettingsItem
                        label={<IonLabel>Username</IonLabel>}
                        input={
                            <IonInput
                                fill="outline"
                                placeholder="MyCoolUsername"
                                type="text"
                                value={newUsername}
                                onIonChange={(e) => {
                                    const newUsername = e.detail.value ?? auth.authInfo!.username!;
                                    setNewUsername(newUsername);
                                }}
                            ></IonInput>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Password</IonLabel>}
                        input={
                            <div className="h-40 w-full">
                                <PasswordInput
                                    className="w-full"
                                    fill="outline"
                                    confirmation
                                    onPasswordChange={setNewPassword}
                                />
                            </div>
                        }
                    />
                    <SettingsItem
                        label={<IonLabel>Key Generation Function</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select function"
                                value={keyGenFunction}
                                onIonChange={(e) => {
                                    const newKeyGenFunction = e.detail.value as KeyGenFunction;
                                    setKeyGenFunction(newKeyGenFunction);
                                }}
                            >
                                <IonSelectOption value="argon2d">Argon2d (Recommended)</IonSelectOption>
                                <IonSelectOption value="pbkdf2">PBKDF2</IonSelectOption>
                            </IonSelect>
                        }
                    />
                </IonGrid>

                {/* Confirmation */}
                <IonButton
                    id="save-changes-button"
                    className="ion-padding-horizontal w-full"
                    onClick={updatePreferences}
                >
                    Save Changes
                </IonButton>

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

export default AccountPreferences;
