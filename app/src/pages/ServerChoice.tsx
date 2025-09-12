import { useEffect, useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonLoading,
    IonPage,
    IonToolbar,
    useIonAlert,
    useIonRouter,
} from "@ionic/react";
import { settings } from "ionicons/icons";

import { checkAPIUrl, getServerTime, getServerVersion } from "@lib/network";
import Preferences from "@lib/preferences";
import { validateURL } from "@lib/url";

import { useAuth } from "@components/auth/context";
import URLInput from "@components/inputs/URLInput";

const Welcome: React.FC = () => {
    // States
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [presentAlert] = useIonAlert();

    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, _setLoadingState] = useState("Checking connectivity...");

    // Functions
    /**
     * Gets the server URL from the form.
     *
     * @returns The server URL
     */
    function getServerURL(): string {
        const inputs = document.querySelectorAll("ion-input");
        let server = inputs[0].value! as string;
        server = server.replace(/\/$/, ""); // Remove trailing slash
        inputs[0].value = server;
        return server;
    }

    /**
     * Handles the confirm button click event.
     */
    async function onConfirm() {
        // Check values
        const serverURL = getServerURL();
        if (!validateURL(serverURL)) {
            presentAlert({
                header: "Invalid URL",
                message: "The URL is missing or invalid.",
                buttons: ["OK"],
            });
            return;
        }
        console.debug(`Received values: ${JSON.stringify(serverURL)}`);
        setIsLoading(true);

        // Check validity of the server URL
        const apiURL = `${serverURL}/api`;

        console.debug(`Checking validity of ${apiURL}...`);
        const checkResult = await checkAPIUrl(apiURL);
        if (!checkResult.reachable) {
            setIsLoading(false);
            console.error(`Could not reach ${serverURL}: ${checkResult.error}`);

            let error = checkResult.error;
            if (error === "Failed to fetch") {
                error = "Please check your internet connection.";
            }

            presentAlert({
                header: "Connection Failure",
                subHeader: `Could not connect to ${serverURL}`,
                message: error,
                buttons: ["OK"],
            });
            return;
        }
        if (!checkResult.valid) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                subHeader: "Invalid API URL",
                message: checkResult.error,
                buttons: ["OK"],
            });
            return;
        }
        if (!checkResult.compatible) {
            setIsLoading(false);
            presentAlert({
                header: "Incompatible API",
                message: "This server is not compatible with this version of Excalibur.",
                buttons: ["OK"],
            });
            return;
        }

        // Get server info
        const versionResponse = await getServerVersion(apiURL!);
        const timeResponse = await getServerTime(apiURL!);
        if (!versionResponse.success || !timeResponse.success) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                message: "Failed to retrieve info from the server.",
                buttons: ["OK"],
            });
            return;
        }

        const serverVersion = versionResponse.version!;
        const serverTime = timeResponse.time!;
        const deltaTime = serverTime.getTime() - new Date().getTime();

        // Update preferences
        Preferences.set({
            server: serverURL,
        });

        // Set server info
        auth.setServerInfo({ apiURL, version: serverVersion, deltaTime });

        // Continue with login
        router.push("/login", "forward", "replace");
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
    }, []);

    // Render
    return (
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="absolute [--ion-toolbar-background:transparent] [&::part(container)]:min-h-16">
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
                        <div className="flex flex-col items-baseline">
                            <h1 className="-mt-4 mb-2 text-2xl font-bold">Choose a Server</h1>
                            <p className="-mt-3 mb-2 text-sm text-wrap">
                                Please enter the URL of your Excalibur server.
                            </p>
                        </div>

                        {/* Form */}
                        <form>
                            <div className="h-18">
                                <URLInput
                                    id="server-input"
                                    label="Server URL"
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            onConfirm();
                                        }
                                    }}
                                />
                            </div>

                            <IonButton id="confirm-button" className="mx-auto pt-4" onClick={() => onConfirm()}>
                                Confirm
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

export default Welcome;
