import * as Comlink from "comlink";
import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
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
import { editVaultInfo, registerUser } from "@lib/users/api";
import { UserVaultInfo } from "@lib/users/structures";
import { VaultKeyGenerationProcessor } from "@lib/workers/generate-vault-keys";

import { AuthInfo, useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";
import PasswordInput from "@components/inputs/PasswordInput";

const NewUser: React.FC = () => {
    // States
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [obfuscatedNames, setObfuscatedNames] = useState(true);
    const [ackState, setACKState] = useState<boolean | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Signing up...");

    const [localVaultKey, setLocalVaultKey] = useState<Buffer>();
    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

    // Contexts
    const auth = useAuth();
    const router = useIonRouter();
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // Functions
    /**
     * Validates the values from the form.
     *
     * @returns Whether the values are valid
     */
    function validateValues() {
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
        if (!validateValues()) {
            presentAlert({
                header: "Invalid Values",
                message: "Some values are missing or invalid.",
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Received values: ${JSON.stringify({ username, password, obfuscatedNames })}`);
        setIsLoading(true);

        // Set up account unlock key (AUK) and vault key using a worker
        const worker = new Worker(new URL("@lib/workers/generate-vault-keys", import.meta.url), { type: "module" });
        const processor = Comlink.wrap<VaultKeyGenerationProcessor>(worker);

        let vaultKeysData;
        try {
            vaultKeysData = await processor.generateVaultKeys(
                password,
                { username },
                auth.vaultInfo!.key,
                "argon2d", // TODO: Allow configuring the default keygen
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
            auk: { key: auk, salt: aukSalt },
            vault: { key: vaultKey, encryptedKey: encryptedVaultKey },
        } = vaultKeysData;

        console.debug(`Generated AUK '${auk.toString("hex")}' and vault key '${vaultKey.toString("hex")}'`);

        setLocalVaultKey(vaultKey);

        // Register new user
        setLoadingState("Registering user...");
        const result = await registerUser(
            auth.serverInfo!.apiURL!,
            username,
            password,
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
            username,
            password,
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

        // Set authentication info
        const authInfo: AuthInfo = { username, password, ...e2eeData };
        auth.setAuthInfo(authInfo);
        console.log(`Token for authentication: ${authInfo.token}`);

        // Update user additional info
        const additionalInfo: UserVaultInfo = { obfuscatedNames };

        const setAdditionalInfoResponse = await editVaultInfo(
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

        // Set vault info for auth
        auth.setVaultInfo({ keygenFunction: "argon2d", auk, key: vaultKey, info: additionalInfo });

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
                        <div className="flex flex-col gap-y-2">
                            {/* Basic Info */}
                            <div className="flex h-58 flex-col gap-y-2">
                                <IonInput
                                    label="Username"
                                    labelPlacement="stacked"
                                    fill="solid"
                                    placeholder="MyCoolUsername"
                                    type="text"
                                    value={username}
                                    onIonInput={(e) => setUsername(e.detail.value!)}
                                />
                                <PasswordInput confirmation value={password} onPasswordChange={setPassword} />
                            </div>
                            <hr />

                            {/* Server Preferences */}
                            <IonCheckbox
                                labelPlacement="end"
                                checked={obfuscatedNames}
                                onIonChange={(e) => setObfuscatedNames(e.detail.checked)}
                            >
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
