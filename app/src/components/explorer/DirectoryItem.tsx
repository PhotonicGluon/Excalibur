import React from "react";

import { IonCol, IonGrid, IonIcon, IonItem, IonLabel, IonNote, IonRow, useIonRouter } from "@ionic/react";
import { documentTextOutline, folderOutline } from "ionicons/icons";

import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable } from "@lib/util";

interface ContainerProps extends FileLike {
    /** Size of the item, in bytes */
    size?: number;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isFile = props.type === "file";

    // States
    const router = useIonRouter();

    // Functions
    /**
     * Handles the user clicking on a directory item.
     */
    function onClick() {
        if (!isFile) {
            // Navigate into the directory
            router.push(`/files/${props.fullpath}`, "forward", "push");
            return;
        }

        // TODO: Handle file case
    }

    // Render
    return (
        <div className="flex h-16 w-full items-center">
            <IonItem className="w-full" button={true} onClick={() => onClick()}>
                <IonGrid>
                    <IonRow className="ion-align-items-center">
                        <IonCol className="flex items-center">
                            <IonIcon className="size-6" icon={isFile ? documentTextOutline : folderOutline} />
                            <div className="pl-4">
                                <IonLabel>{props.name}</IonLabel>
                                {props.size !== undefined && <IonNote>{bytesToHumanReadable(props.size)}</IonNote>}
                            </div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </IonItem>
        </div>
    );
};

export default DirectoryItem;
