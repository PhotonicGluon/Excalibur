import { useParams } from "react-router";

import { IonBreadcrumb, IonBreadcrumbs, IonButton, IonButtons, IonIcon, useIonRouter } from "@ionic/react";
import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { home } from "ionicons/icons";

import { decodeJWT } from "@lib/security/token";

import Countdown from "@components/Countdown";
import { useAuth } from "@components/auth/ProvideAuth";
import DirectoryItem from "@components/explorer/DirectoryItem";

const FileExplorer: React.FC = () => {
    const router = useIonRouter();

    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get token expiry
    const auth = useAuth();
    const { exp: expTimestamp } = decodeJWT<{ exp: number }>(auth.token!);
    const tokenExpiry = new Date(expTimestamp * 1000);

    // Generate breadcrumbs to render
    const breadcrumbPaths = requestedPath.split("/").filter((p) => p !== ".");

    // TODO: Request files list from server

    async function onClickLogout() {
        // Navigate back to login
        router.push("/login", "forward", "replace");

        // Log user out
        await auth.logout();
    }

    // Render
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle class="pr-0" slot="start">
                        Files
                    </IonTitle>
                    <Countdown className="center" date={tokenExpiry} slot="" />
                    <IonButtons className="ion-padding-end" slot="end">
                        <IonButton fill="solid" onClick={() => onClickLogout()}>
                            Logout
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Files</IonTitle>
                    </IonToolbar>
                </IonHeader>
                {/* Breadcrumb */}
                <IonBreadcrumbs maxItems={6} itemsBeforeCollapse={3} itemsAfterCollapse={3}>
                    <IonBreadcrumb routerLink="/files/">
                        <IonIcon slot="start" icon={home}></IonIcon>
                        Home
                    </IonBreadcrumb>
                    {breadcrumbPaths.map((fragment, idx) => (
                        <IonBreadcrumb key={idx} routerLink={`/files/${breadcrumbPaths.slice(0, idx + 1).join("/")}`}>
                            {fragment}
                        </IonBreadcrumb>
                    ))}
                </IonBreadcrumbs>
                {/* Files list */}
                <IonList lines="none">
                    {/* TODO: Add */}
                    <DirectoryItem name="test.txt" type="file" size={12345} />
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default FileExplorer;
