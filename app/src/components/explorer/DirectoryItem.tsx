import React from "react";

import { IonIcon, IonItem, IonLabel, IonNote, IonText } from "@ionic/react";
import { documentOutline, folderOutline } from "ionicons/icons";

import { bytesToHumanReadable } from "@lib/units";

interface ContainerProps {
    /** Name of the item in the directory */
    name: string;
    /** Type of directory item */
    type: "file" | "directory";
    /** Size of the item, in bytes */
    size: number;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const itemIcon = props.type === "file" ? documentOutline : folderOutline;

    // TODO: Add functionality
    return (
        <IonItem button={true}>
            <IonIcon aria-hidden="true" slot="start" icon={itemIcon}></IonIcon>
            <IonLabel>
                <IonText>{props.name}</IonText>
                <br />
                <IonNote>{bytesToHumanReadable(props.size)}</IonNote>
            </IonLabel>
        </IonItem>
    );
};

export default DirectoryItem;
