import React from "react";

import { IonCol, IonGrid, IonIcon, IonItem, IonLabel, IonNote, IonRow } from "@ionic/react";
import { documentOutline, folderOutline } from "ionicons/icons";

import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable } from "@lib/util";

interface ContainerProps extends Omit<FileLike, "fullpath"> {
    /** Size of the item, in bytes */
    size?: number;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isFile = props.type === "file";
    const itemIcon = isFile ? documentOutline : folderOutline;

    // TODO: Add functionality
    return (
        <div className="flex h-16 w-full items-center">
            <IonItem className="w-full" button={true}>
                <IonGrid>
                    <IonRow className="ion-align-items-center">
                        <IonCol className="flex items-center">
                            <IonIcon className="size-6" icon={itemIcon} />
                            <div className="pl-4">
                                <IonLabel>{props.name}</IonLabel>
                                {props.size && <IonNote>{bytesToHumanReadable(props.size)}</IonNote>}
                            </div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </IonItem>
        </div>
    );
};

export default DirectoryItem;
