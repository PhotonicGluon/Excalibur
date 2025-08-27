import { Capacitor } from "@capacitor/core";
import { PrivacyScreen } from "@capacitor/privacy-screen";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { useEffect } from "react";
import { Redirect, Route } from "react-router-dom";

import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
/* Theme variables */
/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/float-elements.css";
/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */
import "@ionic/react/css/palettes/dark.class.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";

import NeedServerURLRoute from "@components/auth/NeedServerURLRoute";
import PrivateRoute from "@components/auth/PrivateRoute";
import { useSettings } from "@components/settings/context";

/* App pages */
import Credits from "@pages/Credits";
import FileExplorer from "@pages/FileExplorer";
import Login from "@pages/Login";
import ServerChoice from "@pages/ServerChoice";
import Settings from "@pages/Settings";
import Welcome from "@pages/Welcome";

import "@theme/variables.css";

// Set up app
setupIonicReact();
if (Capacitor.isNativePlatform()) {
    PrivacyScreen.enable({
        android: { privacyModeOnActivityHidden: "dim", dimBackground: true, preventScreenshots: true },
    });
}

// Helper functions
function toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle("ion-palette-dark", shouldAdd);
}

// App component
const App: React.FC = () => {
    // States
    const settings = useSettings();

    // Effects
    if (Capacitor.isNativePlatform()) {
        useEffect(() => {
            // Lock screen orientation to portrait
            ScreenOrientation.lock({ orientation: "portrait" }).catch((error: Error) => {
                console.warn(error);
            });
        }, []);
    }

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
            <IonReactRouter>
                <IonRouterOutlet>
                    {/* Index */}
                    {localStorage.getItem("hasSeenWelcome") === "true" ? (
                        <Redirect exact from="/" to="/login" />
                    ) : (
                        <Redirect exact from="/" to="/welcome" />
                    )}

                    {/* Welcome */}
                    <Route exact path="/welcome" component={Welcome} />

                    {/* Authentication */}
                    <Route exact path="/server-choice" component={ServerChoice} />
                    <NeedServerURLRoute exact path="/login" component={Login} />

                    {/* Main */}
                    <Redirect exact from="/files" to="/files/." />
                    <PrivateRoute path="/files/*" component={FileExplorer} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/credits" component={Credits} />
                </IonRouterOutlet>
            </IonReactRouter>
        </IonApp>
    );
};

export default App;
