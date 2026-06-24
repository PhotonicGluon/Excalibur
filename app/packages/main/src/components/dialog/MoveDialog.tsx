import React, { useEffect, useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import { close } from "ionicons/icons";

import { listdir, moveItem } from "@lib/files/api";
import { deobfuscateDirectoryItems } from "@lib/files/obfuscation";
import { SortType } from "@lib/files/sorting";
import { Directory } from "@lib/files/structures";

import { useAuth } from "@components/auth/context";
import DirectoryListRaw from "@components/explorer/DirectoryListRaw";
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
    const [destFolder, setDestFolder] = useState<string>(explorerContext.path);
    const [destFolderContents, setDestFolderContents] = useState<Directory | null>(null);

    // Functions
    /**
     * Refreshes the contents of the destination folder.
     */
    function refreshDestFolderContents() {
        console.debug("Refreshing destination folder contents: " + destFolder);
        listdir(auth, destFolder).then((response) => {
            if (!response.success) {
                return;
            }

            let directory = response.directory!;

            // Deobfuscate the names, if necessary
            if (auth.vaultInfo!.info.obfuscatedNames && directory.items && auth.noc) {
                directory = deobfuscateDirectoryItems(directory, auth.noc);
            }

            // Set the deobfuscated directory contents
            setDestFolderContents(directory);
        });
    }

    /**
     * Triggered when modal is about to be presented.
     */
    function onWillPresent() {
        if (destFolder !== explorerContext.path) {
            onClickFolder(explorerContext.path);
        } else {
            // We still need to refresh the contents of the current folder
            refreshDestFolderContents();
        }
    }

    /**
     * Handles clicking on a folder.
     */
    function onClickFolder(fullpath: string) {
        setDestFolderContents(null);
        setDestFolder(fullpath ? fullpath : "."); // Root folder is "."
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
    useEffect(refreshDestFolderContents, [auth, destFolder]);

    // Render
    return (
        <IonModal
            className="min-h-172 [--height:80%] [--width:90vw]"
            id="move-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            onWillPresent={onWillPresent}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonHeader className="h-14">
                <IonToolbar className="pt-0">
                    <IonTitle>Select Destination</IonTitle>
                    <IonButtons slot="end">
                        <IonButton id="move-modal-close" onClick={props.onDidDismiss}>
                            <IonIcon size="large" icon={close} slot="icon-only" />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="flex h-172 flex-col">
                <DirectoryListRaw
                    path={destFolder}
                    directory={destFolderContents}
                    sortValues={{ sortType: SortType.NAME, sortAsc: true }}
                    onParentClickOverride={onClickFolder}
                    directoryItemPropsOverride={(item) => ({
                        disabled: item.type === "file",
                        ellipsisMenuEnabled: false,
                        onClickItemOverride: onClickFolder,
                    })}
                />
            </IonContent>
            <IonFooter>
                <IonToolbar>
                    <IonButtons className="m-2 gap-2" slot="end">
                        <IonButton onClick={props.onDidDismiss}>Cancel</IonButton>
                        <IonButton id="move-modal-confirm" onClick={() => handleMove()} color="primary" fill="solid">
                            Move
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonFooter>
        </IonModal>
    );
};

export default MoveDialog;
