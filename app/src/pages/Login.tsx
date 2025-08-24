import { randomBytes } from "crypto";
import { useEffect, useState } from "react";

import { menuController } from "@ionic/core/components";
import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonLabel,
    IonList,
    IonLoading,
    IonMenu,
    IonMenuButton,
    IonPage,
    IonText,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { informationCircleOutline, logOutOutline, settingsOutline } from "ionicons/icons";

import ExEF from "@lib/exef";
import Preferences from "@lib/preferences";
import { getGroup } from "@lib/security/api";
import { e2ee } from "@lib/security/e2ee";
import generateKey from "@lib/security/keygen";
import { addUser, checkUser } from "@lib/users/api";
import { retrieveVaultKey } from "@lib/users/vault";

import Versions from "@components/Versions";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import { useAuth } from "@contexts/auth";

import logo from "@assets/icon.png";

interface LoginValues {
    /** Username to log in as */
    username: string;
    /** Password for the user */
    password: string;
    /** Whether to save the password */
    savePassword: boolean;
}

const Login: React.FC = () => {
    // States
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Logging in...");

    const [localVaultKey, setLocalVaultKey] = useState<Buffer>();
    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

    // Functions
    /**
     * Gets all values from the form.
     *
     * @returns The values from the form
     */
    function getAllValues(): LoginValues {
        // Get raw inputs
        const inputs = document.querySelectorAll("ion-input");
        const checkboxes = document.querySelectorAll("ion-checkbox");

        // Preprocess
        const username = inputs[0].value! as string;
        const password = inputs[1].value! as string;
        const savePassword = checkboxes[0].checked! as boolean;

        // Form values
        return { username: username, password: password, savePassword: savePassword };
    }

    /**
     * Validates the values from the form.
     *
     * @param values The values from the form
     * @returns Whether the values are valid
     */
    function validateValues({ username, password }: LoginValues) {
        // Check all filled
        if (username === "" || password === "") {
            return false;
        }

        return true;
    }

    /**
     * Handles the login button click event.
     */
    async function onLoginButtonClick() {
        /**
         * Handles the initial registration of the user on the server.
         */
        async function registerOnServer() {
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
            const aukSalt = randomBytes(32);
            const auk = await generateKey(values.password, aukSalt);
            console.debug(`Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`);

            const vaultKey = randomBytes(32);
            console.debug(`Generated vault key '${vaultKey.toString("hex")}'`);
            setLocalVaultKey(vaultKey);
            const exef = new ExEF(auk);
            const encryptedVaultKey = exef.encrypt(vaultKey);

            // Set up SRP key
            setLoadingState("Creating new SRP key...");
            const srpSalt = randomBytes(32);
            const srpKey = await generateKey(values.password, srpSalt);
            console.debug(`Generated SRP key '${srpKey.toString("hex")}' with salt '${srpSalt.toString("hex")}'`);

            const srpVerifier = srpGroup.generateVerifier(srpKey);

            // Set up security details
            setLoadingState("Adding user...");
            await addUser(auth.serverInfo!.apiURL!, values.username, aukSalt, srpSalt, srpVerifier, encryptedVaultKey);
            console.debug("Security details set up");

            // Show vault key
            setIsLoading(false);
            setShowVaultKeyDialog(true);
            presentToast({
                message: "Security details set up. Please save the vault key in a secure location and log in again.",
                duration: 5000,
                color: "success",
            });
        }

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

        // Check whether security details have been set up
        setLoadingState("Finding security details...");
        if (!(await checkUser(auth.serverInfo!.apiURL!, values.username))) {
            setIsLoading(false);
            presentAlert({
                header: "Security Details Not Set Up",
                message: "Security details have not been set up. Would you like to set it up now with your password?",
                buttons: [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            console.debug("Security details setup cancelled");
                            presentToast({
                                message: "Security details setup cancelled",
                                duration: 2000,
                                color: "warning",
                            });
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: registerOnServer,
                    },
                ],
            });
            return;
        }

        // Set up End-to-End Encryption (E2EE)
        const e2eeData = await e2ee(
            auth.serverInfo!.apiURL!,
            values.username,
            values.password,
            () => setIsLoading(false),
            setLoadingState,
            (header, subheader, msg) => {
                presentAlert({ header: header, subHeader: subheader, message: msg, buttons: ["OK"] });
            },
        );
        if (!e2eeData) {
            // Errors already handled in `e2ee()`
            return;
        }

        // Log into the server using the UUID and master key
        console.debug("Logging in...");
        const authInfo = { username: values.username, ...e2eeData };
        try {
            await auth.login(auth.serverInfo!.apiURL!, authInfo);
        } catch (error) {
            console.error(`Could not log in: ${error}`);
            setIsLoading(false);
            presentAlert({
                header: "Login Failure",
                message: `Could not log in: ${error}`,
                buttons: ["OK"],
            });
            return;
        }
        console.log(`Logged in; using token: ${authInfo.token}`);

        // Handle vault key
        const vaultKey = await retrieveVaultKey(auth.serverInfo!.apiURL!, authInfo, (error) => {
            console.error(error);
            setIsLoading(false);
            presentAlert({
                header: "Vault Key Failure",
                message: error,
                buttons: ["OK"],
            });
        });
        if (!vaultKey) {
            // Errors already handled in `retrieveVaultKey()`
            return;
        }
        auth.setVaultKey(vaultKey);

        // Update preferences
        Preferences.set({
            username: values.username,
            password: values.savePassword ? values.password : "",
            savePassword: values.savePassword,
        });

        // Continue with files retrieval
        setIsLoading(false);
        router.push("/files/", "forward", "replace");
        return;
    }

    // Effects
    useEffect(() => {
        // Get existing values from preferences
        Preferences.get("username").then((result) => {
            if (!result) return;
            console.debug(`Got existing username from preferences: ${result}`);
            document.querySelector("#username-input")!.setAttribute("value", result!);
        });
        Preferences.get("password").then((result) => {
            if (!result) return;
            console.debug(`Got existing password from preferences: ${result}`);
            document.querySelector("#password-input")!.setAttribute("value", result!);
        });
        Preferences.get("savePassword").then((rawResult) => {
            const result = rawResult === "true";
            console.debug(`Got existing save password from preferences: ${result}`);
            if (result) {
                document.querySelector("#save-password-checkbox")!.setAttribute("checked", "checked");
            } else {
                document.querySelector("#save-password-checkbox")!.removeAttribute("checked");
            }
        });
    }, []);

    // Render
    return (
        <>
            {/* Hamburger menu */}
            <IonMenu type="overlay" contentId="main-content">
                <IonContent>
                    <IonList
                        lines="none"
                        className="!bg-transparent [&_ion-item]:[--background:transparent] [&_ion-label]:!flex [&_ion-label]:!items-center"
                    >
                        <IonItem
                            button={true}
                            onClick={() => {
                                router.push("/settings", "forward", "push");
                                menuController.close();
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={settingsOutline} size="large" />
                                <IonText className="pl-2">Settings</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem
                            button={true}
                            onClick={() => {
                                router.push("/credits", "forward", "push");
                                menuController.close();
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={informationCircleOutline} size="large" />
                                <IonText className="pl-2">Credits</IonText>
                            </IonLabel>
                        </IonItem>

                        <IonItem
                            button={true}
                            onClick={() => {
                                auth.logout(true); // Fully log out
                                router.push("/server-choice", "forward", "replace");
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={logOutOutline} size="large" />
                                <IonText className="pl-2">Change Server</IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>

                    <Versions className="ion-padding-start ion-padding-end pt-1 *:m-0 *:block" />
                </IonContent>
            </IonMenu>

            <IonPage id="main-content">
                {/* Header content */}
                <IonHeader>
                    <IonToolbar className="absolute [--ion-toolbar-background:transparent]">
                        <IonButtons slot="start">
                            <IonMenuButton id="menu-button" onClick={() => menuController.open()} />
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                {/* Body content */}
                <IonContent fullscreen>
                    {/* Vault key info dialog */}
                    <VaultKeyDialog
                        vaultKey={localVaultKey}
                        isOpen={showVaultKeyDialog}
                        inputDisabled={true}
                        onDidDismiss={() => setShowVaultKeyDialog(false)}
                    />

                    {/* Main container */}
                    <div className="flex h-full items-center justify-center">
                        <div className="mx-auto flex w-4/5 flex-col">
                            {/* Branding */}
                            <div className="flex flex-col items-center">
                                <img src={logo} className="size-36" alt="Excalibur logo" />
                                <h1 className="-mt-4 mb-2 text-2xl font-bold">Login</h1>
                            </div>

                            {/* Form */}
                            <form>
                                <div className="flex flex-col gap-3">
                                    <div className="h-18">
                                        <IonInput
                                            id="username-input"
                                            label="Username"
                                            labelPlacement="stacked"
                                            fill="solid"
                                            placeholder="MyCoolUsername"
                                            type="text"
                                        ></IonInput>
                                    </div>
                                    <div className="h-18">
                                        <IonInput
                                            id="password-input"
                                            label="Password"
                                            labelPlacement="stacked"
                                            fill="solid"
                                            placeholder="My secure password!"
                                            type="password"
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    onLoginButtonClick();
                                                }
                                            }}
                                        >
                                            <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                                        </IonInput>
                                    </div>

                                    <IonCheckbox id="save-password-checkbox" labelPlacement="end">
                                        <div className="w-full *:block *:leading-none">
                                            <IonLabel className="text-base">Save password</IonLabel>
                                            <IonLabel color="danger" className="text-xs text-wrap">
                                                This is not recommended for security reasons.
                                            </IonLabel>
                                        </div>
                                    </IonCheckbox>
                                </div>

                                <IonButton
                                    id="login-button"
                                    className="mx-auto pt-4"
                                    onClick={() => onLoginButtonClick()}
                                >
                                    Log In
                                </IonButton>
                            </form>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <IonLoading
                        className="[&_.loading-wrapper]:!w-full [&_.loading-wrapper_.loading-content]:!w-full"
                        isOpen={isLoading}
                        message={loadingState}
                    ></IonLoading>
                </IonContent>
            </IonPage>
        </>
    );
};

export default Login;
