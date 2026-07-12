import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
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
import { IS_DEV } from "@lib/util";
import { isPrerelease } from "@lib/util/versioning";

import NeedServerURLRoute from "@components/auth/NeedServerURLRoute";
import PrivateRoute from "@components/auth/PrivateRoute";
import { useSettings } from "@components/settings/context";

import DevPages from "@pages/DevPages";
import FileExplorer from "@pages/FileExplorer";
import Login from "@pages/Login";
import NewUser from "@pages/NewUser";
import AccountPreferences from "@pages/Preferences/AccountPreferences";
import DataPreferences from "@pages/Preferences/DataPreferences";
import PreferencesMenu from "@pages/Preferences/PreferencesMenu";
import ServerChoice from "@pages/ServerChoice";
import CryptoSettings from "@pages/Settings/CryptoSettings";
import InterfaceSettings from "@pages/Settings/InterfaceSettings";
import SettingsMenu from "@pages/Settings/SettingsMenu";
import UpdateSettings from "@pages/Settings/UpdateSettings";
import Welcome from "@pages/Welcome";

import "@theme";

// Set up app
setupIonicReact();
enableMapSet(); // To allow immer to update maps

// Helper functions
/**
 * Toggles the dark palette for the app.
 *
 * @param isDark whether to enable the dark palette
 */
function toggleDarkPalette(isDark: boolean) {
    document.documentElement.classList.toggle("ion-palette-dark", isDark);
    SystemBars.setStyle({ style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
}

// Enable privacy screen if on a release build
if (Capacitor.isNativePlatform() && !isPrerelease(packageInfo.version)) {
    PrivacyScreen.enable({
        android: { privacyModeOnActivityHidden: "dim", dimBackground: true, preventScreenshots: true },
    });
}

// Change router for electron build
// (https://github.com/ionic-team/ionic-framework/issues/19246#issuecomment-552858490)
const TheRouter = !IS_DEV && isPlatform("electron") ? IonReactHashRouter : IonReactRouter;

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
            await performUpdateCheck(presentAlert).catch((e) => console.warn(`Update check failed: ${e}`));
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

                    {/* Configuration pages */}
                    <Route exact path="/settings" component={SettingsMenu} />
                    <Route exact path="/settings/interface" component={InterfaceSettings} />
                    <Route exact path="/settings/crypto" component={CryptoSettings} />
                    <Route exact path="/settings/update" component={UpdateSettings} />

                    <PrivateRoute exact path="/preferences" component={PreferencesMenu} />
                    <PrivateRoute exact path="/preferences/account" component={AccountPreferences} />
                    <PrivateRoute exact path="/preferences/data" component={DataPreferences} />

                    {/* Testing */}
                    <Route path="/dev/*" component={DevPages} />
                </IonRouterOutlet>
            </TheRouter>
        </IonApp>
    );
};

export default App;
