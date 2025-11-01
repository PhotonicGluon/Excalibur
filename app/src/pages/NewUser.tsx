import { randomBytes } from "crypto";
import { useState } from "react";

import {
    IonButton,
    IonButtons,
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

import ExEF from "@lib/exef";
import { getGroup } from "@lib/security/api";
import generateKey from "@lib/security/keygen";
import { addUser } from "@lib/users/api";

import { useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";

interface NewUserValues {
    /** Username to sign up as */
    username: string;
    /** Password for the user */
    password: string;
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

        // Preprocess
        const username = rawUsername.trim();
        const password = rawPassword.trim();

        // Form values
        return { username: username, password: password };
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
     * Handles the confirmation of the ACK.
     */
    async function onACKConfirm(ack: Buffer) {
        // Check values
        const values = getAllValues();
        console.log(values);
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

        // Get SRP group used for communication
        setLoadingState("Determining SRP group...");
        const groupResponse = await getGroup(auth.serverInfo!.apiURL!);
        const srpGroup = groupResponse.group;
        if (!srpGroup) {
            setIsLoading(false);
            presentToast({
                message: `Unable to determine server's SRP group: ${groupResponse.error!}`,
                duration: 2000,
                color: "danger",
            });
            return;
        }

        console.debug(`Server is using ${srpGroup.bits}-bit SRP group`);

        // Set up account unlock key (AUK) and vault key
        setLoadingState("Creating new AUK and vault key...");
        const additionalInfo = { username: values.username };

        const aukSalt = randomBytes(32);
        const auk = await generateKey(values.password, additionalInfo, aukSalt);
        console.debug(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);

        const vaultKey = randomBytes(32);
        console.debug(`Generated vault key '${vaultKey.toString("hex")}'`);
        setLocalVaultKey(vaultKey);
        const exef = new ExEF(auk);
        const encryptedVaultKey = exef.encrypt(vaultKey);

        // Set up SRP key
        setLoadingState("Creating new SRP key...");
        const srpSalt = randomBytes(32);
        const srpKey = await generateKey(values.password, additionalInfo, srpSalt);
        console.debug(`Generated SRP key '${srpKey.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

        const srpVerifier = srpGroup.generateVerifier(srpKey);

        // Set up security details
        setLoadingState("Adding user...");
        const result = await addUser(
            auth.serverInfo!.apiURL!,
            ack,
            values.username,
            aukSalt,
            srpSalt,
            srpVerifier,
            encryptedVaultKey,
        );
        if (!result.success) {
            setIsLoading(false);
            presentToast({
                message: `Unable to add user: ${result.error!}`,
                duration: 2000,
                color: "danger",
            });
            return;
        }

        console.debug("Added user");

        // Show vault key
        setIsLoading(false);
        setShowVaultKeyDialog(true);
        presentToast({
            message: "User created. Please save the vault key in a secure location and log in again.",
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
                    onDidDismiss={() => {
                        setShowVaultKeyDialog(false);
                        router.goBack();
                    }}
                />

                {/* Main container */}
                <div className="mx-auto mt-4 flex w-4/5 flex-col">
                    {/* Signup Form */}
                    <form>
                        <div className="flex flex-col gap-3">
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

                            {/* Account creation key & signup button */}
                            <div id="ack-input">
                                <IonLabel>Account Creation Key</IonLabel>
                                <BIP39MnemonicInput
                                    numWords={24}
                                    // initialWords={"artist flavor happy stand sheriff circle jazz south segment domain number zebra analyst business rare daughter catalog term yard aunt alien goose track faint".split(
                                    //     " ",
                                    // )}
                                    maxSuggestions={5}
                                    onEntropy={(ack) => {
                                        onACKConfirm(ack);
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
                        className="[&_.loading-wrapper]:!w-full [&_.loading-wrapper_.loading-content]:!w-full"
                        isOpen={isLoading}
                        message={loadingState}
                    ></IonLoading>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default NewUser;
