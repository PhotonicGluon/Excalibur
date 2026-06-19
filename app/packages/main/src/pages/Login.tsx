import { useState } from "react";

import { menuController } from "@ionic/core/components";
import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
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

import { e2ee } from "@lib/auth/e2ee";
import { useEffectOnce, useMount } from "@lib/hooks";
import Preferences from "@lib/preferences";
import { checkUser, getAdditionalUserInfo } from "@lib/users/api";
import { AdditionalUserInfo } from "@lib/users/structures";
import { retrieveVaultKey } from "@lib/users/vault";

import SidebarMenu from "@components/SidebarMenu";
import { AuthInfo, useAuth } from "@components/auth/context";
import PasswordInput from "@components/inputs/PasswordInput";

import logo from "@assets/icon.png";

const Login: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [savePassword, setSavePassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState("Logging in...");

    // Contexts
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    // Functions
    /**
     * Validates the values from the form.
     *
     * @param values The values from the form
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
     * Handles the login button click event.
     */
    async function onLoginButtonClick() {
        // Check values
        if (!validateValues()) {
            presentAlert({
                header: "Invalid Values",
                message: "Some values are missing or invalid.",
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Received username '${username}', password '${password}', savePassword: ${savePassword})`);
        setIsLoading(true);

        // Check whether user exists
        setLoadingState("Finding user...");
        try {
            if (!(await checkUser(auth.serverInfo!.apiURL!, username))) {
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

        // Retrieve the vault key
        try {
            const vaultKey = await retrieveVaultKey(
                auth.serverInfo!.apiURL!,
                e2eeData.token,
                e2eeData.key,
                e2eeData.auk,
                (error) => {
                    console.error(error);
                    setIsLoading(false);
                    presentAlert({
                        header: "Vault Key Failure",
                        message: error,
                        buttons: ["OK"],
                    });
                },
            );
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

        // Obtain any additional information
        let additionalInfo: AdditionalUserInfo;
        try {
            const additionalInfoResponse = await getAdditionalUserInfo(
                auth.serverInfo!.apiURL!,
                e2eeData.token,
                e2eeData.key,
            );
            if (!additionalInfoResponse.success) {
                throw new Error(additionalInfoResponse.error);
            }
            additionalInfo = additionalInfoResponse.info!;
        } catch (error: unknown) {
            console.error(error);
            setIsLoading(false);
            presentAlert({
                header: "Additional Info Failure",
                message: `Could not retrieve additional info: ${error}`,
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Got additional info: ${JSON.stringify(additionalInfo)}`);

        // Set authentication info
        const authInfo: AuthInfo = {
            username: username,
            obfuscatedNames: additionalInfo.obfuscatedNames ?? false,
            ...e2eeData,
        };
        auth.setAuthInfo(authInfo);
        console.log(`Token for authentication: ${authInfo.token}`);

        // Update preferences
        Preferences.set({
            username: username,
            password: savePassword ? password : "",
            savePassword: savePassword,
        });

        // Continue with files retrieval
        setIsLoading(false);
        router.push("/files/", "forward", "replace");
    }

    // Effects
    useEffectOnce(() => {
        // Log out user if they're still logged in (e.g., if got kicked back due to network issues)
        if (auth.getToken()) {
            auth.logout();
        }
    });

    useMount(() => {
        // Get existing values from preferences
        Preferences.get("username").then((result) => {
            if (!result) return;
            console.debug(`Got existing username from preferences: ${result}`);
            setUsername(result);
        });
        Preferences.get("password").then((result) => {
            if (!result) return;
            console.debug(`Got existing password from preferences: ${result}`);
            setPassword(result);
        });
        Preferences.get("savePassword").then((rawResult) => {
            const result = rawResult === "true";
            console.debug(`Got existing save password from preferences: ${result}`);
            if (result) {
                setSavePassword(true);
            } else {
                setSavePassword(false);
            }
        });
    });

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
                                    <div className="h-20">
                                        <IonInput
                                            label="Username"
                                            labelPlacement="stacked"
                                            fill="solid"
                                            placeholder="MyCoolUsername"
                                            type="text"
                                            value={username}
                                            onIonInput={(e) => setUsername(e.detail.value!)}
                                        ></IonInput>
                                    </div>
                                    <div className="h-20">
                                        <PasswordInput
                                            value={password}
                                            onPasswordChange={setPassword}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    onLoginButtonClick();
                                                }
                                            }}
                                        />
                                    </div>

                                    <IonCheckbox
                                        labelPlacement="end"
                                        checked={savePassword}
                                        onIonChange={(e) => setSavePassword(e.detail.checked)}
                                    >
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

                            <hr />
                            <IonText className="mt-2 text-center">
                                No account?{" "}
                                <IonText
                                    id="new-user-link"
                                    className="underline transition-all duration-100 hover:cursor-pointer hover:text-blue-500 dark:hover:text-blue-600"
                                    color="primary"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        router.push("/new-user", "forward", "push");
                                    }}
                                >
                                    Sign Up
                                </IonText>
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
