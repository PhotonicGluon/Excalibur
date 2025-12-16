import { PickedFile } from "@capawesome/capacitor-file-picker";
import { DragEvent, useEffect, useState } from "react";

import { IonIcon, IonRefresher, IonRefresherContent, IonText, RefresherCustomEvent } from "@ionic/react";
import { cloudUploadOutline } from "ionicons/icons";

import { useDirectory, useUploadFile } from "@lib/hooks";

import DirectoryList from "@components/explorer/DirectoryList";
import { useExplorerContext } from "@components/explorer/context";

export type UploadFile = PickedFile & { directory?: string };

const FilesArea: React.FC = () => {
    // States
    const [showFileUploadOverlay, setShowFileUploadOverlay] = useState(false);

    // Contexts
    const explorerContext = useExplorerContext();

    // Hooks
    const { directoryContents, refreshContents } = useDirectory(explorerContext.path, explorerContext.presentSnackbar);
    const { onDropFileItem } = useUploadFile(
        explorerContext.path,
        explorerContext.jobsManager,
        explorerContext.presentAlert,
        explorerContext.presentSnackbar,
    );

    // Effects
    useEffect(() => {
        refreshContents();
    }, [explorerContext.path, refreshContents]);

    // Render
    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setShowFileUploadOverlay(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                setShowFileUploadOverlay(false);
            }}
            onDrop={async (e: DragEvent) => {
                e.preventDefault();
                setShowFileUploadOverlay(false);

                onDropFileItem(e);
            }}
            id="files-area"
        >
            {/* Refresh indicator */}
            <IonRefresher
                slot="fixed"
                onIonRefresh={(event: RefresherCustomEvent) => {
                    refreshContents().then(() => {
                        event.detail.complete();
                    });
                }}
            >
                <IonRefresherContent />
            </IonRefresher>

            {/* File upload overlay */}
            {showFileUploadOverlay && (
                <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex flex-col items-center justify-center bg-black/50">
                    <IonIcon icon={cloudUploadOutline} className="size-20" />
                    <IonText>Drop files here to upload</IonText>
                </div>
            )}

            {/* Files list */}
            {directoryContents && (
                <DirectoryList {...directoryContents!} showParentButton={explorerContext.path !== "."} />
            )}
        </div>
    );
};

export default FilesArea;
