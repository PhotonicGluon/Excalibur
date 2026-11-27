import { PickedFile } from "@capawesome/capacitor-file-picker";
import { useEffect, useRef, useState } from "react";

import { IonIcon, IonText } from "@ionic/react";
import { cloudUploadOutline } from "ionicons/icons";

import { useDirectory, useUploadFile } from "@lib/hooks";

import DirectoryList, { ViewLayout } from "@components/explorer/DirectoryList";
import { useExplorerContext } from "@components/explorer/context";

export type UploadFile = PickedFile & { directory?: string };

interface ContainerProps {
    /** The view layout to use */
    viewLayout: ViewLayout;
    /** A trigger to refresh the directory contents */
    refreshTrigger: number;
}

const FilesArea: React.FC<ContainerProps> = ({ refreshTrigger, viewLayout }) => {
    // States
    const [displayedPath, setDisplayedPath] = useState(""); // Empty string because first path will be '.'
    const [showFileUploadOverlay, setShowFileUploadOverlay] = useState(false);

    // References
    const dragDepth = useRef(0);

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

    useEffect(() => {
        const isFileDrag = (e: globalThis.DragEvent) => e.dataTransfer?.types.includes("Files");

        const onDragEnter = (e: globalThis.DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current++;
            setShowFileUploadOverlay(true);
        };
        const onDragOver = (e: globalThis.DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
        };
        const onDragLeave = (e: globalThis.DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) {
                setShowFileUploadOverlay(false);
            }
        };
        const onDrop = (e: globalThis.DragEvent) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current = 0;
            setShowFileUploadOverlay(false);
            onDropFileItem(e);
        };

        window.addEventListener("dragenter", onDragEnter);
        window.addEventListener("dragover", onDragOver);
        window.addEventListener("dragleave", onDragLeave);
        window.addEventListener("drop", onDrop);
        return () => {
            window.removeEventListener("dragenter", onDragEnter);
            window.removeEventListener("dragover", onDragOver);
            window.removeEventListener("dragleave", onDragLeave);
            window.removeEventListener("drop", onDrop);
        };
    }, [onDropFileItem]);

    // Render
    return (
        <div id="files-area">
            {/* File upload overlay */}
            {showFileUploadOverlay && (
                <div className="pointer-events-none fixed top-0 right-0 bottom-0 left-0 z-10 flex flex-col items-center justify-center backdrop-blur-xs">
                    <IonIcon icon={cloudUploadOutline} className="size-20" />
                    <IonText>Drop files here to upload</IonText>
                </div>
            )}

            {/* Files list */}
            <DirectoryList
                directory={directoryContents}
                viewLayout={viewLayout}
                listenerConnected={listenerConnected}
            />
        </div>
    );
};

export default FilesArea;
