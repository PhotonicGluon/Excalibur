import React, { useEffect, useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonLabel,
    IonList,
    IonModal,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import { close, sadOutline } from "ionicons/icons";

import { listdir, moveItem } from "@lib/files/api";
import { sortItems } from "@lib/files/sorting";
import { Directory } from "@lib/files/structures";
import { getBaseName, getParent } from "@lib/util";

import { useAuth } from "@components/auth/context";
import DirectoryItem from "@components/explorer/DirectoryItem";
import { NUM_PENDING_ITEMS } from "@components/explorer/DirectoryList";
import { useExplorerContext } from "@components/explorer/context";

interface MoveDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when the dialog is dismissed */
    onDidDismiss: () => void;
    /** Original item's path **/
    path: string;
}

const MoveDialog: React.FC<MoveDialogProps> = (props) => {
    // Contexts
    const auth = useAuth();
    const explorerContext = useExplorerContext();

    // States
    const [destFolder, setDestFolder] = useState<string>(".");
    const [destFolderContents, setDestFolderContents] = useState<Directory | null>();

    // Functions
    /**
     * Handles clicking on a folder.
     */
    function onClickFolder(fullpath: string) {
        // TODO: Add animation
        setDestFolderContents(null);
        setDestFolder(fullpath);
    }

    /**
     * Handles the move operation.
     */
    async function handleMove() {
        if (destFolder === explorerContext.path) {
            explorerContext.presentSnackbar("Item was already at this location", "warning");
            props.onDidDismiss();
            return;
        }

        const moveResponse = await moveItem(auth, props.path, destFolder);
        if (!moveResponse.success) {
            explorerContext.presentSnackbar(`Failed to move item: ${moveResponse.error}`, "danger");
            return;
        }

        explorerContext.presentSnackbar("Item moved", "success");
        props.onDidDismiss();
    }

    // Effects
    useEffect(() => {
        if (!props.isOpen) return;

        console.debug("Refreshing possible destination folder contents: " + destFolder);
        listdir(auth, destFolder).then((response) => {
            if (response.success) {
                setDestFolderContents(response.directory);
            }
        });
    }, [auth, destFolder, props.isOpen]);

    // Render
    const hasParent = destFolder !== ".";

    let MainBody: React.ReactNode;
    if (destFolderContents === null) {
        MainBody = Array.from({ length: NUM_PENDING_ITEMS }).map((_, idx) => (
            <DirectoryItem
                key={idx}
                oddRow={idx % 2 === (hasParent ? 1 : 0)} // Treat row 0 as the first odd row
            ></DirectoryItem>
        ));
    } else if (destFolderContents && destFolderContents.items && destFolderContents.items.length > 0) {
        MainBody = sortItems(destFolderContents).map((item, idx) => (
            <DirectoryItem
                key={idx}
                disabled={item.type === "file"}
                oddRow={idx % 2 === (hasParent ? 1 : 0)} // Treat row 0 as the first odd row
                name={item.name}
                fullpath={item.fullpath}
                type={item.type}
                mimetype={item.type === "file" ? item.mimetype : undefined}
                size={item.type === "file" ? item.size : undefined}
                ellipsisMenuEnabled={false}
                onClickItemOverride={onClickFolder}
            />
        ));
    } else {
        MainBody = (
            <div className="mt-4 flex justify-center">
                <div className="flex flex-col items-center">
                    <IonIcon icon={sadOutline} className="size-16 pb-1"></IonIcon>
                    <IonLabel className="text-lg">No items</IonLabel>
                </div>
            </div>
        );
    }

    return (
        <IonModal
            className="min-h-172 [--height:80%] [--width:85vw]"
            id="move-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonHeader className="h-14">
                <IonToolbar className="pt-0">
                    <IonTitle>
                        Select destination for{" "}
                        <span className="font-mono">{getBaseName(props.path).replace(".exef", "")}</span>
                    </IonTitle>
                    <IonButtons slot="end">
                        <IonButton id="move-modal-close" onClick={props.onDidDismiss}>
                            <IonIcon size="large" icon={close} slot="icon-only" />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="flex h-172 flex-col">
                <IonList lines="none" className="overflow-y-auto rounded-lg bg-transparent pt-0">
                    {hasParent && (
                        <DirectoryItem
                            oddRow={true}
                            name="(Go Back)"
                            fullpath={getParent("./" + destFolder)}
                            type="parent"
                            onClickItemOverride={onClickFolder}
                        ></DirectoryItem>
                    )}
                    {MainBody}
                </IonList>
            </IonContent>
            <IonFooter>
                <IonToolbar>
                    <IonButtons className="m-2 gap-2" slot="end">
                        <IonButton onClick={props.onDidDismiss}>Cancel</IonButton>
                        <IonButton onClick={() => handleMove()} color="primary" fill="solid">
                            Move
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonFooter>
        </IonModal>
    );
};

export default MoveDialog;
