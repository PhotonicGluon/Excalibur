import { useEffect, useState } from "react";
import { Redirect, useHistory, useLocation, useParams } from "react-router";

import { IonBreadcrumb, IonBreadcrumbs, IonIcon, useIonAlert } from "@ionic/react";
import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { home } from "ionicons/icons";

import { getToken } from "@lib/security/auth";

import DirectoryItem from "@components/explorer/DirectoryItem";

import { LoginData } from "@pages/Login";

const FileExplorer: React.FC = () => {
    const history = useHistory();
    const [token, setToken] = useState("");
    const [presentAlert] = useIonAlert();

    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get auth params from login page
    const location = useLocation<LoginData>();
    const loginData = location.state;
    if (!loginData) {
        // TODO: Is there a cleaner way of doing this?
        console.error("No login data found");
        return <Redirect to="/login" />;
    }
    const {
        apiURL: apiURL,
        e2eeData: { uuid, key },
    } = loginData;

    /**
     * Obtain an authentication token by exchanging the master key for a token.
     * If the token exchange fails, an alert will be shown with the error message.
     *
     * @returns The authentication token, or undefined if the exchange fails.
     */
    async function obtainAuthToken(): Promise<string | undefined> {
        const tokenResponse = await getToken(apiURL, uuid, key);
        if (!tokenResponse.success) {
            // TODO: Possibly handle E2EE exchange again
            presentAlert({
                header: "Token Retrieval Failed",
                message: tokenResponse.error,
                buttons: ["OK"],
            });
            return;
        }
        return tokenResponse.token!;
    }

    function switchToDirectory(path: string) {
        history.push(`/files/${path}`, loginData);
    }

    // Add mount code
    useEffect(() => {
        obtainAuthToken().then((token) => {
            if (!token) {
                return;
            }
            console.log(`Got token: ${token}`);
            setToken(token);
        });
    });

    // TODO: Request files list from server

    // Generate breadcrumbs to render
    const breadcrumbPaths = requestedPath.split("/").filter((p) => p !== ".");

    // Render
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Files</IonTitle>
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
                    <IonBreadcrumb className="hover:cursor-pointer" onClick={() => switchToDirectory("")}>
                        <IonIcon slot="start" icon={home}></IonIcon>
                        Home
                    </IonBreadcrumb>
                    {breadcrumbPaths.map((fragment, idx) => (
                        <IonBreadcrumb
                            key={idx}
                            className="hover:cursor-pointer"
                            onClick={() => switchToDirectory(breadcrumbPaths.slice(0, idx + 1).join("/"))}
                        >
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
