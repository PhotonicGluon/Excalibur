import React from "react";

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

import { moveItem } from "@lib/files/api";
import { getBaseName, getParent } from "@lib/util";

import { useAuth } from "@components/auth/context";
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
    const origDir = getParent("./" + props.path);

    // States
    const [destFolder, _setDestFolder] = React.useState(origDir);

    // Contexts
    const auth = useAuth();
    const explorerContext = useExplorerContext();

    // Functions
    /**
     * Handles the move operation.
     */
    async function handleMove() {
        if (destFolder === "") {
            explorerContext.presentSnackbar("Destination folder cannot be empty", "danger");
            return;
        }

        if (destFolder === origDir) {
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
    }

    // Render
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
            <IonContent className="flex h-172 flex-col">{/* TODO: Add move UI here */}</IonContent>
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
