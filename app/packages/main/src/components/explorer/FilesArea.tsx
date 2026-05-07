import { PickedFile } from "@capawesome/capacitor-file-picker";
import { DragEvent, useEffect, useState } from "react";

import { IonIcon, IonText } from "@ionic/react";
import { cloudUploadOutline } from "ionicons/icons";

import { useDirectory, useUploadFile } from "@lib/hooks";

import DirectoryList from "@components/explorer/DirectoryList";
import { useExplorerContext } from "@components/explorer/context";

export type UploadFile = PickedFile & { directory?: string };

const FilesArea: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    // States
    const [displayedPath, setDisplayedPath] = useState(""); // Empty string because first path will be '.'
    const [showFileUploadOverlay, setShowFileUploadOverlay] = useState(false);

    // Contexts
    const explorerContext = useExplorerContext();

    // Hooks
    const { directoryContents, refreshContents, listenerConnected } = useDirectory();
    const { onDropFileItem } = useUploadFile();

    // Effects
    useEffect(() => {
        if (displayedPath === explorerContext.path) {
            return;
        }
        refreshContents(explorerContext.path).then(() => setDisplayedPath(explorerContext.path));
    }, [displayedPath, explorerContext.path, refreshContents]);

    useEffect(() => {
        refreshContents(explorerContext.path);
    }, [refreshTrigger, explorerContext.path, refreshContents]);

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
            {/* File upload overlay */}
            {showFileUploadOverlay && (
                <div className="pointer-events-none fixed top-0 right-0 bottom-0 left-0 z-10 flex flex-col items-center justify-center backdrop-blur-xs">
                    <IonIcon icon={cloudUploadOutline} className="size-20" />
                    <IonText>Drop files here to upload</IonText>
                </div>
            )}

            {/* Files list */}
            <DirectoryList directory={directoryContents} listenerConnected={listenerConnected} />
        </div>
    );
};

export default FilesArea;
