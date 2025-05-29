import { useParams } from "react-router";

import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";

import DirectoryItem from "@components/explorer/DirectoryItem";

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // TODO: Request files list from server

    const pageTitle = requestedPath === "." ? "Home" : requestedPath;
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{pageTitle}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">{pageTitle}</IonTitle>
                    </IonToolbar>
                </IonHeader>
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
