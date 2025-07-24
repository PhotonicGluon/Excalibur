import { PrivacyScreen } from "@capacitor/privacy-screen";
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
import "@ionic/react/css/palettes/dark.system.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/typography.css";

import { PrivateRoute, ProvideAuth } from "@components/auth";

/* App pages */
import FileExplorer from "@pages/FileExplorer";
import Login from "@pages/Login";
import Settings from "@pages/Settings";

import "@theme/variables.css";

setupIonicReact();

PrivacyScreen.enable();

const App: React.FC = () => (
    <IonApp>
        <ProvideAuth>
            <IonReactRouter>
                <IonRouterOutlet>
                    <Route exact path="/login" component={Login} />
                    <PrivateRoute path="/files/*" component={FileExplorer} />
                    <PrivateRoute path="/settings" component={Settings} />
                    <Redirect exact from="/" to="/login" />
                </IonRouterOutlet>
            </IonReactRouter>
        </ProvideAuth>
    </IonApp>
);

export default App;
