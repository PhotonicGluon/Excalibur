import { randomBytes } from "crypto";
import { useEffect, useState } from "react";

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
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { settings } from "ionicons/icons";

import ExEF from "@lib/exef";
import { checkAPICompatibility, checkAPIUrl } from "@lib/network";
import Preferences from "@lib/preferences";
import { getGroup } from "@lib/security/api";
import { e2ee } from "@lib/security/e2ee";
import generateKey from "@lib/security/keygen";
import { addUser, checkUser } from "@lib/users/api";
import { retrieveVaultKey } from "@lib/users/vault";
import { validateURL } from "@lib/validators";

import URLInput from "@components/inputs/URLInput";
import { useAuth } from "@contexts/auth";

import logo from "@assets/icon.png";

interface LoginValues {
    /** URL to the server */
    server: string;
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
        let server = inputs[0].value! as string;
        server = server.replace(/\/$/, ""); // Remove trailing slash
        inputs[0].value = server;

        const username = inputs[1].value! as string;
        const password = inputs[2].value! as string;
        const savePassword = checkboxes[0].checked! as boolean;

        // Form values
        return { server: server, username: username, password: password, savePassword: savePassword };
    }

    /**
     * Validates the values from the form.
     *
     * @param values The values from the form
     * @returns Whether the values are valid
     */
    function validateValues({ server, username, password }: LoginValues) {
        // Check all filled
        if (server === "" || username === "" || password === "") {
            return false;
        }

        // Check server URL
        if (!validateURL(server)) {
            return false;
        }

        return true;
    }

    /**
     * Handles the login button click event.
     */
    async function onLoginButtonClick() {
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

        // Check connectivity to the server
        const apiURL = `${values.server}/api`;
        console.debug(`Checking connectivity to ${apiURL}...`);

        const connectionResult = await checkAPIUrl(apiURL);
        if (!connectionResult.reachable) {
            setIsLoading(false);
            console.error(`Could not reach ${values.server}: ${connectionResult.error}`);

            let error = connectionResult.error;
            if (error === "Failed to fetch") {
                error = "Please check your internet connection.";
            }

            presentAlert({
                header: "Connection Failure",
                subHeader: `Could not connect to ${values.server}`,
                message: error,
                buttons: ["OK"],
            });
            return;
        }
        if (!connectionResult.validAPIUrl) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                subHeader: "Invalid API URL",
                message: connectionResult.error,
                buttons: ["OK"],
            });
            return;
        }

        // Check API compatibility
        const compatibilityResult = await checkAPICompatibility(apiURL);
        if (!compatibilityResult.valid) {
            setIsLoading(false);
            presentAlert({
                header: "Incompatible API",
                message: "This server is not compatible with this version of Excalibur.",
                buttons: ["OK"],
            });
            return;
        }

        // Check whether security details have been set up
        setLoadingState("Finding security details...");
        if (!(await checkUser(apiURL, values.username))) {
            setIsLoading(false);
            presentAlert({
                header: "Security Details Not Set Up",
                message: "Security details have not been set up. Would you like to set it up now with your password?",
                buttons: [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            console.debug("Security details setup cancelled.");
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
                        handler: async () => {
                            // Get SRP group used for communication
                            setLoadingState("Determining SRP group...");
                            const groupResponse = await getGroup(apiURL);
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
                            console.debug("Creating new AUK and vault key");
                            const aukSalt = randomBytes(32);
                            const auk = await generateKey(values.password, aukSalt);
                            console.debug(
                                `Generated AUK '${auk.toString("hex")}' with salt '${aukSalt.toString("hex")}'`,
                            );

                            const vaultKey = randomBytes(32);
                            console.debug(`Generated vault key '${vaultKey.toString("hex")}'`);
                            const exef = new ExEF(auk);
                            const encryptedVaultKey = exef.encrypt(vaultKey);

                            // Set up SRP key
                            console.debug("Creating new SRP key");

                            const srpSalt = randomBytes(32);
                            const srpKey = await generateKey(values.password, srpSalt);
                            console.debug(
                                `Generated SRP key '${srpKey.toString("hex")}' with salt '${srpSalt.toString("hex")}'`,
                            );

                            const srpVerifier = srpGroup.generateVerifier(srpKey);

                            // Set up security details
                            await addUser(apiURL, values.username, aukSalt, srpSalt, srpVerifier, encryptedVaultKey);
                            console.debug("Security details set up");
                            presentToast({
                                message: "Security details set up. Please log in again.",
                                duration: 5000,
                                color: "success",
                            });
                        },
                    },
                ],
            });
            return;
        }

        // Set up End-to-End Encryption (E2EE)
        const e2eeData = await e2ee(
            apiURL,
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
        const authInfo = { apiURL: apiURL, username: values.username, ...e2eeData };
        try {
            await auth.login(authInfo);
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
        const vaultKey = await retrieveVaultKey(authInfo, (error) => {
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
            server: values.server,
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
        Preferences.get("server").then((result) => {
            if (!result) return;
            console.debug(`Got existing server URL from preferences: ${result}`);
            document.querySelector("#server-input")!.setAttribute("value", result!);
        });
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
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="absolute [--ion-toolbar-background:transparent]">
                    <IonButtons slot="start">
                        {/* Settings button */}
                        <IonButton id="settings-button" color="medium" onClick={() => router.push("/settings")}>
                            <IonIcon className="size-6" slot="icon-only" icon={settings}></IonIcon>
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
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
                                    <URLInput id="server-input" label="Server URL" />
                                </div>
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

                            <IonButton id="login-button" className="mx-auto pt-4" onClick={() => onLoginButtonClick()}>
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
    );
};

export default Login;
