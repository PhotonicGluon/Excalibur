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

import { useEffectOnce } from "@lib/hooks";
import { APICheckResult, checkAPIUrl, getServerVersion, timedFetch } from "@lib/network";
import Preferences from "@lib/preferences";
import { validateURL } from "@lib/url";
import { IS_DEV } from "@lib/util";

import { useAuth } from "@components/auth/context";
import URLInput from "@components/inputs/URLInput";

const API_CHECK_TIMEOUT = 3; // In seconds

const ServerChoice: React.FC = () => {
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

        const checkPromises = urlsToCheck.map(
            (url) =>
                new Promise<{ url: string; result: APICheckResult }>((resolve, reject) => {
                    console.debug(`Checking validity of ${url}...`);
                    checkAPIUrl(url, API_CHECK_TIMEOUT).then((result) => {
                        if (!result.reachable) {
                            console.debug(`Could not reach ${url}: ${result.error}`);
                            reject({ url, result });
                            return;
                        }
                        if (!result.valid) {
                            console.debug(`Invalid API URL: ${url}`);
                            reject({ url, result });
                            return;
                        }
                        console.debug(`Found valid API URL: ${url}`);
                        resolve({ url, result });
                    });
                }),
        );

        let outcome: { url: string; result: APICheckResult };
        try {
            outcome = await Promise.any(checkPromises);
        } catch {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                message: "Please check your internet connection and the entered URL.",
                buttons: ["OK"],
            });
            return;
        }

        if (!outcome.result.compatible) {
            setIsLoading(false);
            presentAlert({
                header: "Incompatible API",
                message: outcome.result.error!,
                buttons: ["OK"],
            });
            return;
        }

        // Get server version
        const response = await getServerVersion(outcome.url);
        if (!response.success) {
            setIsLoading(false);
            presentAlert({
                header: "Connection Failure",
                message: "Failed to retrieve server version.",
                buttons: ["OK"],
            });
            return;
        }

        const serverVersion = response.version!;

        // Update preferences
        Preferences.set({
            server: serverURL,
        });

        // Set server info
        auth.setServerInfo({
            apiURL: outcome.url,
            isFixed,
            version: serverVersion,
        });

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

    useEffectOnce(() => {
        // Detect if an API server shares this URL
        const baseURL = window.location.origin.replace(/:\d+$/, ""); // Replace any port that might appear
        const possibleAPIUrl = `${baseURL}:52419/api/well-known/version`;
        timedFetch(possibleAPIUrl, {}, API_CHECK_TIMEOUT)
            .catch((_error) => {}) // Don't care about errors
            .then((result) => {
                if (!result) {
                    console.log("No API server autodetected running on same host");
                    return;
                }

                console.log("API server autodetected running on same host");
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
                                    defaultValue={IS_DEV ? "http://localhost:8888" : ""}
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
                    className="[&_.loading-wrapper]:w-full [&_.loading-wrapper_.loading-content]:w-full"
                    isOpen={isLoading}
                    message={loadingState}
                ></IonLoading>
            </IonContent>
        </IonPage>
    );
};

export default ServerChoice;
