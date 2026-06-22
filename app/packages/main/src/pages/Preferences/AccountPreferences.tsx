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
    IonTitle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { generateVaultKeyData } from "@lib/crypto/keygen";
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

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Logging in...");

    // Functions
    /**
     * Handles any updates to the preferences' values.
     */
    async function updatePreferences() {
        setIsLoading(true);

        // Process the new preferences
        const oldPref = {
            username: auth.authInfo!.username!,
            password: auth.authInfo!.password!,
        };
        const newPref = {
            username: newUsername ?? oldPref.username,
            password: newPassword ?? oldPref.password,
        };
        console.log(`Got new preferences' values: ${JSON.stringify(newPref)}`);

        // Handle new username
        if (newPref.username !== oldPref.username) {
            console.debug(`Updating username to "${newPref.username}"...`);
            console.log(newPref.username, oldPref.password);

            // Regenerate AUK and encrypted vault key
            const {
                auk: { salt: newAUKSalt },
                vault: { encryptedKey: newEncryptedVaultKey },
            } = await generateVaultKeyData(oldPref.password, { username: newPref.username }, auth.vaultKey!);

            // Send edit request
            const response = await editRecord(
                auth,
                newPref.username,
                oldPref.password,
                newAUKSalt,
                newEncryptedVaultKey,
                () => setIsLoading(false),
                setLoadingState,
                (header, subheader, msg) => {
                    presentAlert({ header: header, subHeader: subheader, message: msg, buttons: ["OK"] });
                },
            );
            if (!response.success) {
                console.error(response.error);
                presentToast({
                    message: `Failed to update username: ${response.error}`,
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
            });
            presentToast({
                message: "Username updated successfully",
                duration: 2000,
                color: "success",
            });
        }
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
                </IonGrid>

                {/* Confirmation */}
                <IonButton className="ion-padding-horizontal w-full" onClick={updatePreferences}>
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
