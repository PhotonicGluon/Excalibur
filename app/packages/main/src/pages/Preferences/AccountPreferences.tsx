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
    IonPage,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { useAuth } from "@components/auth/context";
import PasswordInput from "@components/inputs/PasswordInput";
import SettingsItem from "@components/settings/SettingsItem";

const AccountPreferences: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [newUsername, setNewUsername] = useState<string>(auth.authInfo!.username!);
    const [newPassword, setNewPassword] = useState<string>("");

    // Functions
    /**
     * Handles any updates to the preferences' values.
     */
    async function updatePreferences() {
        // Process the new preferences
        const newPref = {
            // username: newUsername && newUsername !== auth.authInfo!.username! ? newUsername : undefined,
            username: newUsername ? newUsername : undefined,
            password: newPassword ? newPassword : undefined,
        };
        console.log(`Got new preferences' values: ${JSON.stringify(newPref)}`);

        // Handle new username
        if (newPref.username) {
            console.debug(`Updating username to "${newPref.username}"...`);
            // const response = await editUsername(auth, newPref.username);
            // if (!response.success) {
            //     console.error("Failed to update username:", response.error);
            //     return;
            // }

            // auth.setAuthInfo({
            //     ...auth.authInfo!,
            //     token: auth.getToken()!,
            //     username: newPref.username,
            // });
            console.debug("Username updated successfully");
        }
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
            </IonContent>
        </IonPage>
    );
};

export default AccountPreferences;
