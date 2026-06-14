import randomBytes from "randombytes";
import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonLabel,
    IonLoading,
    IonPage,
    IonText,
    IonTitle,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { e2ee } from "@lib/auth/e2ee";
import ExEF from "@lib/crypto/exef";
import generateKey from "@lib/crypto/keygen";
import { editAdditionalUserInfo, registerUser } from "@lib/users/api";
import { AdditionalUserInfo } from "@lib/users/structures";

import { AuthInfo, useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";

interface NewUserValues {
    /** Username to sign up as */
    username: string;
    /** Password for the user */
    password: string;
    /** Whether to use obfuscated names */
    obfuscatedNames: boolean;
}

const NewUser: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const [ackState, setACKState] = useState<boolean | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Signing up...");

    const [localVaultKey, setLocalVaultKey] = useState<Buffer>();
    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

    // Functions
    /**
     * Gets all values from the form.
     *
     * @returns The values from the form
     */
    function getAllValues(): NewUserValues {
        // Get raw inputs
        const rawUsername = (document.querySelector("#new-username-input")! as HTMLIonInputElement).value! as string;
        const rawPassword = (document.querySelector("#new-password-input")! as HTMLIonInputElement).value! as string;
        const rawObfuscatedNames = (document.querySelector("#use-obfuscated-names")! as HTMLIonCheckboxElement)
            .checked! as boolean;

        // Preprocess
        const username = rawUsername.trim();
        const password = rawPassword.trim();
        const obfuscatedNames = rawObfuscatedNames;

        // Form values
        return { username: username, password: password, obfuscatedNames: obfuscatedNames };
    }

    /**
     * Validates the values from the form.
     *
     * @param values The values from the form
     * @returns Whether the values are valid
     */
    function validateValues({ username, password }: NewUserValues) {
        // Check all filled
        if (username === "" || password === "") {
            return false;
        }

        return true;
    }

    /**
     * Handles the confirmation of the registration values.
     */
    async function onConfirm(ack: Buffer) {
        // Check values
        const values = getAllValues();
        if (!validateValues(values)) {
            presentAlert({
                header: "Invalid Values",
                message: "Some values are missing or invalid.",
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Received values: ${JSON.stringify(values)}`);
        setIsLoading(true);

        // Set up account unlock key (AUK) and vault key
        setLoadingState("Creating new AUK and vault key...");
        const keygenAdditionalInfo = { username: values.username };

        const aukSalt = randomBytes(32);
        const auk = await generateKey(values.password, keygenAdditionalInfo, aukSalt);
        console.debug(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);

        const vaultKey = randomBytes(32);
        console.debug(`Generated vault key '${vaultKey.toString("hex")}'`);
        setLocalVaultKey(vaultKey);
        const exef = new ExEF(auk);
        const encryptedVaultKey = exef.encrypt(vaultKey);

        // Register new user
        setLoadingState("Registering user...");
        const result = await registerUser(
            auth.serverInfo!.apiURL!,
            values.username,
            values.password,
            ack,
            aukSalt,
            encryptedVaultKey,
            () => setIsLoading(false),
            setLoadingState,
            (header, subheader, msg) => {
                presentAlert({ header: header, subHeader: subheader, message: msg, buttons: ["OK"] });
            },
        );
        if (!result.success) {
            // We've already handled the error
            return;
        }

        console.debug("Added user");

        // Set up End-to-End Encryption (E2EE)
        const e2eeData = await e2ee(
            auth.serverInfo!.apiURL!,
            values.username,
            values.password,
            () => setIsLoading(false),
            setLoadingState,
            (header, subheader, msg, buttons) => {
                presentAlert({ header: header, subHeader: subheader, message: msg, buttons: buttons ?? ["OK"] });
            },
        );
        if (!e2eeData) {
            // Errors already handled in `e2ee()`
            return;
        }

        // Set vault key for auth
        auth.setVaultKey(vaultKey);

        // Update user additional info
        const additionalInfo: AdditionalUserInfo = {
            obfuscatedNames: values.obfuscatedNames,
        };

        const setAdditionalInfoResponse = await editAdditionalUserInfo(
            auth.serverInfo!.apiURL!,
            e2eeData.token,
            e2eeData.key,
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

        // Set authentication info
        const authInfo: AuthInfo = {
            username: values.username,
            obfuscatedNames: values.obfuscatedNames,
            ...e2eeData,
        };
        auth.setAuthInfo(authInfo);
        console.log(`Token for authentication: ${authInfo.token}`);

        // Show vault key
        setIsLoading(false);
        setShowVaultKeyDialog(true);
        presentToast({
            message: "User created. Please save the vault key in a secure location.",
            duration: 5000,
            color: "success",
        });
    }

    // Render
    return (
        <IonPage id="main-content">
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
                    <IonButtons slot="start">
                        <IonButton onClick={() => router.goBack()}>
                            <IonIcon className="size-6" slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>Create New User</IonTitle>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent>
                {/* Vault key info dialog */}
                <VaultKeyDialog
                    vaultKey={localVaultKey}
                    isOpen={showVaultKeyDialog}
                    inputDisabled={true}
                    onDidDismiss={async () => {
                        setShowVaultKeyDialog(false);
                        router.push("/files/", "forward", "replace");
                        window.location.reload(); // Needed to avoid sidebar from showing the "Change Server" option
                    }}
                />

                {/* Main container */}
                <div className="mx-auto mt-4 flex w-4/5 flex-col">
                    {/* Signup Form */}
                    <form>
                        <div className="flex flex-col gap-3">
                            {/* Basic Info */}
                            <div className="h-18">
                                <IonInput
                                    id="new-username-input"
                                    label="Username"
                                    labelPlacement="stacked"
                                    fill="solid"
                                    placeholder="MyCoolUsername"
                                    type="text"
                                ></IonInput>
                            </div>
                            <div className="h-18">
                                <IonInput
                                    id="new-password-input"
                                    label="Password"
                                    labelPlacement="stacked"
                                    fill="solid"
                                    placeholder="My secure password!"
                                    type="password"
                                >
                                    <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                                </IonInput>
                            </div>
                            <hr />

                            {/* Server Settings */}
                            <IonCheckbox id="use-obfuscated-names" labelPlacement="end" checked={true}>
                                <div className="w-full *:block *:leading-none">
                                    <IonLabel className="text-base">Use Obfuscated Names</IonLabel>
                                    <IonLabel color="medium" className="text-xs text-wrap">
                                        Names will appear to be obfuscated from the perspective of the server, further
                                        improving privacy.
                                    </IonLabel>
                                </div>
                            </IonCheckbox>
                            <hr className="mt-2" />

                            {/* Account creation key & signup button */}
                            <div id="ack-input">
                                <IonLabel>Account Creation Key</IonLabel>
                                <BIP39MnemonicInput
                                    numWords={24}
                                    maxSuggestions={5}
                                    onEntropy={(ack) => {
                                        onConfirm(ack); // Triggers the registration process
                                    }}
                                    onError={() => {
                                        setACKState(false);
                                        setTimeout(() => {
                                            setACKState(null);
                                        }, 2000);
                                    }}
                                />
                                <div className="mb-2 h-8 text-center">
                                    {ackState === false && (
                                        <IonText color="danger">Invalid account creation key</IonText>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Loading indicator */}
                    <IonLoading
                        className="[&_.loading-wrapper]:w-full [&_.loading-wrapper_.loading-content]:w-full"
                        isOpen={isLoading}
                        message={loadingState}
                    ></IonLoading>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default NewUser;
