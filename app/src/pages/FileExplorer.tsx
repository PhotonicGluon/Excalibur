import { useEffect, useState } from "react";
import { useParams } from "react-router";

import {
    IonBreadcrumb,
    IonBreadcrumbs,
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenu,
    IonMenuButton,
    IonPopover,
    IonText,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { chevronForward, ellipsisVertical, home, logOutOutline, refresh, search } from "ionicons/icons";

import { listdir } from "@lib/files/rest";
import { Directory } from "@lib/files/structures";
import { decodeJWT } from "@lib/security/token";

import Countdown from "@components/Countdown";
import { useAuth } from "@components/auth/ProvideAuth";
import DirectoryItem from "@components/explorer/DirectoryItem";
import DirectoryList from "@components/explorer/DirectoryList";

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get token expiry
    const auth = useAuth();
    const { exp: expTimestamp } = decodeJWT<{ exp: number }>(auth.token!);
    const tokenExpiry = new Date(expTimestamp * 1000);

    // Generate breadcrumbs to render
    const breadcrumbPaths = requestedPath.split("/").filter((p) => p !== ".");

    // States
    const router = useIonRouter();
    const [presentToast] = useIonToast();
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);

    // Functions
    /**
     * Logs the user out of the app and navigates back to the login screen.
     *
     * @param withLogout If true, calls the logout function to invalidate the current token. If
     *      false, only navigates back to the login screen.
     */
    async function handleLogout(withLogout: boolean = true) {
        // Show toast
        presentToast({
            message: "You have been logged out.",
            duration: 3000,
        });

        // Navigate back to login
        router.push("/login", "forward", "replace");

        // Log user out
        if (withLogout) {
            await auth.logout();
        }
    }

    /**
     * Fetches the contents of the current directory and updates the component state to reflect
     * the new contents.
     *
     * If the request fails, it displays a toast with an error message and does not update the
     * component state.
     *
     * @param showToast If true, displays a toast telling the user that the page was refreshed
     */
    async function refreshContents(showToast: boolean = true) {
        const response = await listdir(auth, requestedPath);
        if (!response.success) {
            presentToast({
                message: response.error,
                duration: 3000,
            });
            return;
        }
        setDirectoryContents(response.directory!);
        if (showToast) {
            presentToast({
                message: "Refreshed",
                duration: 1000,
            });
        }
    }

    // Effects
    useEffect(() => {
        // Refresh directory contents
        refreshContents(false);
    }, []);

    // Render
    return (
        <>
            {/* Hamburger menu */}
            <IonMenu type="overlay" contentId="main-content">
                <IonContent>
                    <IonList lines="none" className="h-full [&_ion-label]:!flex [&_ion-label]:!items-center">
                        <IonItem button={true} onClick={() => handleLogout()}>
                            <IonLabel>
                                <IonIcon icon={logOutOutline} size="large" />
                                <IonText className="pl-2">Logout</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem>TODO: Add more hamburger menu items</IonItem>
                    </IonList>
                </IonContent>
            </IonMenu>

            {/* Ellipsis menu*/}
            <IonPopover dismissOnSelect={true} trigger="ellipsis-button">
                <IonContent>
                    <IonList lines="none" className="h-full [&_ion-label]:!flex [&_ion-label]:!items-center">
                        <IonItem button={true} onClick={() => refreshContents()}>
                            <IonLabel>
                                <IonIcon icon={refresh} size="small" />
                                <IonText className="pl-2">Refresh Directory</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem>TODO: Add more ellipsis menu items</IonItem>
                    </IonList>
                </IonContent>
            </IonPopover>

            {/* Main content */}
            <IonPage id="main-content">
                {/* Header content */}
                <IonHeader>
                    <IonToolbar className="flex">
                        <IonButtons slot="start">
                            <IonMenuButton></IonMenuButton>
                        </IonButtons>
                        <div className="flex" slot="">
                            <Countdown
                                className="w-full text-center"
                                endDate={tokenExpiry}
                                onExpiry={() => handleLogout(false)}
                            />
                        </div>
                        <IonButtons className="ion-padding-end" slot="end">
                            {/* Search button */}
                            <IonButton>
                                {/* TODO: Add functionality */}
                                <IonIcon icon={search}></IonIcon>
                            </IonButton>
                            {/* Ellipsis menu trigger button */}
                            <IonButton id="ellipsis-button">
                                <IonIcon icon={ellipsisVertical} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                {/* Body content */}
                <IonContent fullscreen>
                    <IonHeader collapse="condense">
                        <IonToolbar>
                            <IonTitle size="large">Files</IonTitle>
                        </IonToolbar>
                    </IonHeader>
                    {/* Breadcrumb */}
                    <IonBreadcrumbs className="pt-1" maxItems={6} itemsBeforeCollapse={3} itemsAfterCollapse={3}>
                        <IonBreadcrumb routerLink="/files/">
                            <IonIcon slot="" icon={home} />
                            <IonIcon slot="separator" icon={chevronForward} />
                        </IonBreadcrumb>
                        {breadcrumbPaths.map((fragment, idx) => (
                            <IonBreadcrumb
                                key={idx}
                                routerLink={`/files/${breadcrumbPaths.slice(0, idx + 1).join("/")}`}
                            >
                                {fragment}
                                <IonIcon slot="separator" icon={chevronForward} />
                            </IonBreadcrumb>
                        ))}
                    </IonBreadcrumbs>
                    {/* Files list */}
                    {directoryContents && (
                        <DirectoryList
                            name={directoryContents!.name}
                            type="directory"
                            items={directoryContents!.items}
                        />
                    )}
                </IonContent>
            </IonPage>
        </>
    );
};

export default FileExplorer;
