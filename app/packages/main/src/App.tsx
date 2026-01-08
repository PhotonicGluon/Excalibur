import { Capacitor } from "@capacitor/core";
import { PrivacyScreen } from "@capacitor/privacy-screen";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { enableMapSet } from "immer";
import { useEffect } from "react";
import { Redirect, Route } from "react-router-dom";

import { isPlatform } from "@ionic/core";
import { IonApp, IonRouterOutlet, setupIonicReact, useIonAlert } from "@ionic/react";
import { IonReactHashRouter, IonReactRouter } from "@ionic/react-router";
import "@ionic/react/css/core.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/palettes/dark.class.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import packageInfo from "@root/package.json";

import { performUpdateCheck } from "@lib/check-update";
import { useEffectOnce, useMount } from "@lib/hooks";
import Preferences from "@lib/preferences";
import { isPrerelease } from "@lib/util/versioning";

import NeedServerURLRoute from "@components/auth/NeedServerURLRoute";
import PrivateRoute from "@components/auth/PrivateRoute";
import { useSettings } from "@components/settings/context";

import FileExplorer from "@pages/FileExplorer";
import Login from "@pages/Login";
import NewUser from "@pages/NewUser";
import ServerChoice from "@pages/ServerChoice";
import Settings from "@pages/Settings";
import TestPage from "@pages/TestPage";
import Welcome from "@pages/Welcome";

import "@theme/variables.css";

// Set up app
setupIonicReact();
enableMapSet(); // To allow immer to update maps

// Helper functions
function toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle("ion-palette-dark", shouldAdd);
}

// Enable privacy screen if on a release build
if (Capacitor.isNativePlatform() && !isPrerelease(packageInfo.version)) {
    PrivacyScreen.enable({
        android: { privacyModeOnActivityHidden: "dim", dimBackground: true, preventScreenshots: true },
    });
}

// Change router for electron build
// (https://github.com/ionic-team/ionic-framework/issues/19246#issuecomment-552858490)
const TheRouter =
    process.env.NODE_ENV !== "development" && isPlatform("electron") ? IonReactHashRouter : IonReactRouter;

// App component
const App: React.FC = () => {
    // Contexts
    const settings = useSettings();

    // States
    const [presentAlert] = useIonAlert();

    // Effects
    useEffectOnce(() => {
        if (Capacitor.isNativePlatform()) {
            // Lock screen orientation to portrait
            ScreenOrientation.lock({ orientation: "portrait" }).catch((error: Error) => {
                console.warn(error);
            });
        }
    });

    useMount(() => {
        Preferences.get("lastUpdateCheck").then(async (lastUpdateCheckRaw) => {
            // Check if we need to actually check for update
            const lastUpdateCheck = lastUpdateCheckRaw ? parseInt(lastUpdateCheckRaw) : 0;
            const nextCheck = new Date(lastUpdateCheck + settings.checkUpdateInterval * 60 * 60 * 1000);
            if (nextCheck >= new Date()) {
                console.debug(`Update check not due yet (due ${nextCheck})`);
                return;
            }

            await Preferences.set({ lastUpdateCheck: Date.now() });
            await performUpdateCheck(presentAlert);
        });
    });

    useEffect(() => {
        // Set app theme
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
        toggleDarkPalette((prefersDark.matches && settings.theme === "system") || settings.theme === "dark");

        // Set up listeners for changes to the prefers-color-scheme media query
        const setDarkPaletteFromMediaQuery = (mediaQuery: MediaQueryListEvent) => {
            toggleDarkPalette((mediaQuery.matches && settings.theme === "system") || settings.theme === "dark");
        };

        // Listen for changes to the prefers-color-scheme media query
        prefersDark.addEventListener("change", setDarkPaletteFromMediaQuery);

        return () => {
            prefersDark.removeEventListener("change", setDarkPaletteFromMediaQuery);
        };
    }, [settings.theme]);

    // Render app
    return (
        <IonApp>
            <TheRouter>
                <IonRouterOutlet>
                    {/* Index */}
                    {window.localStorage.getItem("hasSeenWelcome") === "true" ? (
                        <Redirect exact from="/" to="/login" />
                    ) : (
                        <Redirect exact from="/" to="/welcome" />
                    )}

                    {/* Welcome */}
                    <Route exact path="/welcome" component={Welcome} />

                    {/* Authentication */}
                    <Route exact path="/server-choice" component={ServerChoice} />
                    <NeedServerURLRoute exact path="/login" component={Login} />
                    <NeedServerURLRoute exact path="/new-user" component={NewUser} />

                    {/* Main */}
                    <Redirect exact from="/files" to="/files/." />
                    <PrivateRoute path="/files/*" component={FileExplorer} />
                    <Route path="/settings" component={Settings} />

                    {/* Testing */}
                    <Route path="/test" component={TestPage} />
                </IonRouterOutlet>
            </TheRouter>
        </IonApp>
    );
};

export default App;
