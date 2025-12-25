import { useEffect, useState } from "react";

import { menuController } from "@ionic/core/components";
import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonInputPasswordToggle,
    IonLabel,
    IonLoading,
    IonMenuButton,
    IonPage,
    IonText,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";

import Preferences from "@lib/preferences";
import { e2ee } from "@lib/security/e2ee";
import { checkUser } from "@lib/users/api";
import { retrieveVaultKey } from "@lib/users/vault";

import SidebarMenu from "@components/SidebarMenu";
import { useAuth } from "@components/auth/context";

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
    // Contexts
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
        try {
            if (!(await checkUser(auth.serverInfo!.apiURL!, values.username))) {
                setIsLoading(false);
                presentAlert({
                    header: "User Not Found",
                    message: "Please create the user first.",
                    buttons: [
                        {
                            text: "OK",
                            role: "cancel",
                        },
                    ],
                });
                return;
            }
        } catch (error: unknown) {
            console.error(error);
            presentToast({
                message: `An error occurred: ${error}`,
                duration: 2000,
                color: "danger",
            });
            setIsLoading(false);
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
        try {
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
        } catch (error: unknown) {
            console.error(error);
            setIsLoading(false);
            presentAlert({
                header: "Vault Key Failure",
                message: `Could not retrieve vault key: ${error}`,
                buttons: ["OK"],
            });
            return;
        }

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
            <SidebarMenu
                mainContentID="main-content"
                menuController={menuController}
                preventExit={auth.serverInfo?.isFixed}
                exitButtonText="Change Server"
                onExit={() => {
                    auth.logout(true); // Also remove saved API URL
                    router.push("/server-choice", "forward", "replace");
                }}
            ></SidebarMenu>

            <IonPage id="main-content">
                {/* Header content */}
                <IonHeader>
                    <IonToolbar className="absolute [--ion-toolbar-background:transparent] [&::part(container)]:min-h-16">
                        <IonButtons slot="start">
                            <IonMenuButton id="menu-button" onClick={() => menuController.open()} />
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
                                    className="mx-auto w-full pt-4"
                                    onClick={() => onLoginButtonClick()}
                                >
                                    Log In
                                </IonButton>
                            </form>

                            <hr className="mt-4 mb-2 h-px w-full bg-neutral-200 dark:bg-neutral-700"></hr>
                            <IonText className="mt-2 text-center">
                                No account?{" "}
                                <span
                                    id="new-user-link"
                                    className="text-blue-400 underline transition-all duration-100 hover:cursor-pointer hover:text-blue-500"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        router.push("/new-user", "forward", "push");
                                    }}
                                >
                                    Sign Up
                                </span>
                            </IonText>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    <IonLoading
                        className="[&_.loading-wrapper]:w-full [&_.loading-wrapper_.loading-content]:w-full"
                        isOpen={isLoading}
                        message={loadingState}
                    ></IonLoading>
                </IonContent>
            </IonPage>
        </>
    );
};

export default Login;
