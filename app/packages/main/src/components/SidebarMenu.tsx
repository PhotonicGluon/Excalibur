import { MenuControllerI } from "@ionic/core";
import {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonText,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { logOutOutline, settingsOutline } from "ionicons/icons";

import Versions from "@components/Versions";
import { useAuth } from "@components/auth/context";

interface ContainerProps {
    /** ID of the main content to attach this menu to */
    mainContentID: string;
    /** Controller for the menu */
    menuController: MenuControllerI;
    /** Whether to prevent the exit button from being shown */
    preventExit?: boolean;
    /** Text for the exit button */
    exitButtonText: string;
    /** Handler for when the user clicks the exit button */
    onExit: () => void;
}

const SidebarMenu: React.FC<ContainerProps> = ({
    mainContentID,
    menuController,
    preventExit,
    exitButtonText,
    onExit,
}) => {
    // Get contexts
    const auth = useAuth();
    const router = useIonRouter();

    // Render
    return (
        <IonMenu type="overlay" contentId={mainContentID}>
            <IonHeader>
                <IonToolbar className="ion-padding-top min-h-16">
                    <IonTitle>
                        <div className="flex items-center gap-4">
                            <IonText className="flex-none font-bold [font-variant:small-caps]">Excalibur</IonText>
                            {auth.authInfo && (
                                <IonText className="grow truncate text-right font-mono text-sm font-bold">
                                    {auth.authInfo?.username}
                                </IonText>
                            )}
                        </div>
                    </IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                {/* Actions */}
                <IonList
                    lines="none"
                    className="bg-transparent [&_ion-item]:[--background:transparent] [&_ion-label]:flex [&_ion-label]:items-center"
                >
                    <IonItem
                        button={true}
                        onClick={() => {
                            router.push("/settings", "forward", "push");
                            menuController.close();
                        }}
                    >
                        <IonLabel>
                            <IonIcon icon={settingsOutline} size="large" />
                            <IonText className="pl-2">Settings</IonText>
                        </IonLabel>
                    </IonItem>
                    {!preventExit && (
                        <IonItem button={true} onClick={() => onExit()}>
                            <IonLabel>
                                <IonIcon icon={logOutOutline} size="large" />
                                <IonText className="pl-2">{exitButtonText}</IonText>
                            </IonLabel>
                        </IonItem>
                    )}
                </IonList>

                {/* Details */}
                <div className="ion-padding-start ion-padding-end pt-1 *:m-0 *:block *:text-xs md:*:text-sm">
                    <Versions />
                    <IonText color="medium">
                        Delta time: <span className="font-mono">{auth.serverInfo!.deltaTime} ms</span>
                    </IonText>
                </div>
            </IonContent>
        </IonMenu>
    );
};

export default SidebarMenu;
