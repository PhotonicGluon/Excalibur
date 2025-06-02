import { useParams } from "react-router";

import { IonBreadcrumb, IonBreadcrumbs, IonIcon } from "@ionic/react";
import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { home } from "ionicons/icons";

import DirectoryItem from "@components/explorer/DirectoryItem";

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

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
