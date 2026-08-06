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

import ExEF from "@lib/crypto/exef";
import { KeyGenAlgorithm, generateAUK, generateVaultKeys } from "@lib/crypto/keygen";
import { editVaultInfo } from "@lib/users/api";
import { editRecord } from "@lib/users/api/edit-record";

import { useAuth } from "@components/auth/context";
import PasswordDialog from "@components/dialog/PasswordDialog";
import PasswordInput from "@components/inputs/PasswordInput";
import SettingsItem from "@components/settings/SettingsItem";

const AccountPreferences: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // States
    const [newUsername, setNewUsername] = useState<string>(auth.authInfo!.username);
    const [newPassword, setNewPassword] = useState<string>("");
    const [keygenAlgorithm, setKeygenAlgorithm] = useState<KeyGenAlgorithm>(auth.vaultInfo!.keygenAlgorithm);

    const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Sending request...");

    // Functions
    /**
     * Handles any updates to the preferences' values.
     *
     * @param password the password to use for the update
     */
    async function updatePreferences(password: string) {
        setIsLoading(true);

        // Check if the provided password is indeed correct by checking if the vault key can be recovered
        const { key: proposedAUK } = await generateAUK(
            password,
            { username: auth.authInfo!.username! },
            auth.vaultInfo!.aukSalt,
            auth.vaultInfo!.keygenAlgorithm,
            (progress: number) => {
                setLoadingState(`Checking password... ${Math.round(progress * 100)}%`);
            },
        );

        try {
            await new ExEF(proposedAUK).decrypt(auth.vaultInfo!.encryptedKey);
        } catch (e) {
            console.error("Password is likely incorrect, causing", e);
            presentToast({
                message: "Password incorrect",
                duration: 2000,
                color: "danger",
            });
            setIsLoading(false);
            return;
        }

        console.debug("Entered password checked to be correct");

        // Process the new preferences
        const oldPref = {
            username: auth.authInfo!.username,
            password: password,
            keygenAlgorithm: auth.vaultInfo!.keygenAlgorithm,
        };

        const newPref = {
            username: newUsername ?? oldPref.username,
            password: newPassword && newPassword !== "" ? newPassword : oldPref.password,
            keygenAlgorithm: keygenAlgorithm ?? oldPref.keygenAlgorithm,
        };
        console.log(`Got new preferences' values: ${JSON.stringify(newPref)}`);

        if (JSON.stringify(newPref) === JSON.stringify(oldPref)) {
            presentToast({
                message: "No changes",
                duration: 2000,
                color: "warning",
            });
            setIsLoading(false);
            return;
        }

        // Regenerate AUK and encrypted vault key
        const {
            auk: { salt: newAUKSalt },
            vault: { encryptedKey: newEncryptedVaultKey },
        } = await generateVaultKeys(
            newPref.password,
            { username: newPref.username },
            auth.vaultInfo!.key,
            newPref.keygenAlgorithm,
            (progress: number) => {
                setLoadingState(`Deriving keys... ${Math.round(progress * 100)}%`);
            },
        );

        // Send edit request
        const editRecordResponse = await editRecord(
            auth,
            newPref.username,
            newPref.password,
            newAUKSalt,
            newEncryptedVaultKey,
            () => setIsLoading(false),
            setLoadingState,
            (header, subheader, msg) => {
                presentAlert({ header: header, subHeader: subheader, message: msg, buttons: ["OK"] });
            },
        );
        if (!editRecordResponse.success) {
            const errorMsg = `Failed to update account: ${editRecordResponse.error}`;
            console.error(errorMsg);
            presentToast({
                message: errorMsg,
                duration: 2000,
                color: "danger",
            });
            setIsLoading(false);
            return;
        }

        if (newPref.keygenAlgorithm !== oldPref.keygenAlgorithm) {
            const editVaultInfoResponse = await editVaultInfo(
                auth.serverInfo!.apiURL!,
                auth.getToken()!,
                auth.authInfo!.key,
                newPref.keygenAlgorithm,
                auth.vaultInfo!.info,
            );
            if (!editVaultInfoResponse.success) {
                const errorMsg = `Failed to update vault info: ${editVaultInfoResponse.error}`;
                console.error(errorMsg);
                presentToast({
                    message: errorMsg,
                    duration: 2000,
                    color: "danger",
                });
                setIsLoading(false);
                return;
            }
        }

        // Update auth context
        auth.setAuthInfo({
            ...auth.authInfo!,
            token: auth.getToken()!,
            username: newPref.username,
        });
        auth.setVaultInfo({
            ...auth.vaultInfo!,
            keygenAlgorithm: newPref.keygenAlgorithm,
            encryptedKey: newEncryptedVaultKey,
            aukSalt: newAUKSalt,
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
                        label={<IonLabel>Key Generation Algorithm</IonLabel>}
                        input={
                            <IonSelect
                                interface="popover"
                                fill="outline"
                                placeholder="Select algorithm"
                                value={keygenAlgorithm}
                                onIonChange={(e) => {
                                    const newKeygenAlgorithm = e.detail.value as KeyGenAlgorithm;
                                    setKeygenAlgorithm(newKeygenAlgorithm);
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
                    onClick={() => setIsPasswordPromptOpen(true)}
                >
                    Save Changes
                </IonButton>

                {/* Password prompt */}
                <PasswordDialog
                    isOpen={isPasswordPromptOpen}
                    onDidDismiss={() => setIsPasswordPromptOpen(false)}
                    onDidConfirm={(password) => {
                        setIsPasswordPromptOpen(false);
                        updatePreferences(password);
                    }}
                />

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
