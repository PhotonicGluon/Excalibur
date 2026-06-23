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

import generateVaultKeyData, { SlowHashFunction as KeyGenFunction } from "@lib/crypto/keygen";
import { editRecord } from "@lib/users/api/edit-record";

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
        setIsLoading(true);

        // Process the new preferences
        const oldUsername = auth.authInfo!.username!;
        const oldPassword = auth.authInfo!.password!;
        const oldKeyGenFunction = auth.authInfo!.keygenFunction!;

        const newPref = {
            username: newUsername ?? oldUsername,
            password: newPassword && newPassword !== "" ? newPassword : oldPassword,
            keygenFunction: keyGenFunction ?? oldKeyGenFunction,
        };
        console.log(`Got new preferences' values: ${JSON.stringify(newPref)}`);

        if (
            newPref.username === oldUsername &&
            newPref.password === oldPassword &&
            newPref.keygenFunction === oldKeyGenFunction
        ) {
            // No changes needed
            setIsLoading(false);
            presentToast({
                message: "No changes",
                duration: 2000,
                color: "warning",
            });
            return;
        }

        // Regenerate AUK and encrypted vault key
        const {
            auk: { salt: newAUKSalt },
            vault: { encryptedKey: newEncryptedVaultKey },
        } = await generateVaultKeyData(
            newPref.password,
            { username: newPref.username },
            auth.vaultKey!,
            newPref.keygenFunction,
        );

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
