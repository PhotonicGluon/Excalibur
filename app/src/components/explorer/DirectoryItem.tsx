import React from "react";

import { IonIcon, IonItem, IonLabel, IonNote, IonText } from "@ionic/react";
import { documentOutline, folderOutline } from "ionicons/icons";

import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable } from "@lib/util";

interface ContainerProps extends Omit<FileLike, "fullpath"> {
    /** Size of the item, in bytes */
    size?: number;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const itemIcon = props.type === "file" ? documentOutline : folderOutline;

    // TODO: Add functionality
    return (
        <div className="h-16 flex items-center w-full">
            <IonItem className="w-full" button={true}>
                <IonIcon aria-hidden="true" slot="start" icon={itemIcon}></IonIcon>
                <IonLabel>
                    <IonText>{props.name}</IonText>
                    {props.size && (
                        <>
                            <br />
                            <IonNote>{bytesToHumanReadable(props.size)}</IonNote>
                        </>
                    )}
                </IonLabel>
            </IonItem>
        </div>
    );
};

export default DirectoryItem;
