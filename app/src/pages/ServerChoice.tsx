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

import { checkAPIUrl, getServerTime, getServerVersion, timedFetch } from "@lib/network";
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
     *
     * @param isFixed Whether the API URL is fixed and cannot be changed
     */
    async function onConfirm(isFixed?: boolean) {
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

        // Check possible API urls
        const urlsToCheck = [];
        if (!/:\d+$/.test(serverURL)) {
            urlsToCheck.push(`${serverURL}:52419/api`); // 52419 is default Excalibur server port
        }
        urlsToCheck.push(`${serverURL}/api`); // Always check the original URL

        let apiURL;
        for (const url of urlsToCheck) {
            console.debug(`Checking validity of ${url}...`);
            const checkResult = await checkAPIUrl(url);
            if (!checkResult.reachable) {
                console.error(`Could not reach ${url}: ${checkResult.error}`);
                continue;
            }
            if (!checkResult.valid) {
                console.error(`Invalid API URL: ${url}`);
                continue;
            }
            apiURL = url;
            break;
        }

        if (!apiURL) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                message: "Please check your internet connection and the entered URL.",
                buttons: ["OK"],
            });
            return;
        }

        const checkResult = await checkAPIUrl(apiURL);
        if (!checkResult.compatible) {
            setIsLoading(false);
            presentAlert({
                header: "Incompatible API",
                message: checkResult.error!,
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
        auth.setServerInfo({ apiURL, isFixed, version: serverVersion, deltaTime });

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

    useEffect(() => {
        // Detect if an API server shares this URL
        const baseURL = window.location.origin.replace(/:\d+$/, ""); // Replace any port that might appear
        const possibleAPIUrl = `${baseURL}:52419/api/well-known/version`;
        timedFetch(possibleAPIUrl)
            .catch((_error) => {
                console.log("No API server was autodetected as running on the same host");
            })
            .then((result) => {
                if (!result) {
                    console.log("No API server was autodetected as running on the same host");
                    return;
                }

                console.log("API server was autodetected as running on the same host");
                document.querySelector("#server-input")!.setAttribute("value", baseURL);
                onConfirm(true);
            });
    });

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
