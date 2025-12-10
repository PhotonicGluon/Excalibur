import { DragEvent, RefObject, useEffect, useState } from "react";

import { IonIcon, IonText } from "@ionic/react";
import { cloudUploadOutline } from "ionicons/icons";

import { useDirectory } from "@lib/hooks";

import DirectoryList from "@components/explorer/DirectoryList";
import { useUIFeedback } from "@components/explorer/context";

interface ContainerProps {
    requestedPathRef: RefObject<string>;
}

const FilesArea: React.FC<ContainerProps> = (props) => {
    // States
    const [showFileUploadOverlay, setShowFileUploadOverlay] = useState(false);

    // Contexts
    const uiFeedback = useUIFeedback();

    // Hooks
    const { directoryContents, refreshContents } = useDirectory(props.requestedPathRef, uiFeedback.presentToast);

    // Effects
    useEffect(() => {
        refreshContents();
    });

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
            onDrop={async (e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setShowFileUploadOverlay(false);

                console.log(e);

                // onDropFileItem(e);
            }}
        >
            {/* File upload overlay */}
            {showFileUploadOverlay && (
                <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex flex-col items-center justify-center bg-black/50">
                    <IonIcon icon={cloudUploadOutline} className="size-20" />
                    <IonText>Drop files here to upload</IonText>
                </div>
            )}

            {/* Files list */}
            {directoryContents && (
                <DirectoryList {...directoryContents!} showParentButton={props.requestedPathRef.current !== "."} />
            )}
        </div>
    );
};

export default FilesArea;
