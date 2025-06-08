import React from "react";

import {
    IonCol,
    IonGrid,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonNote,
    IonRow,
    useIonRouter,
} from "@ionic/react";
import { documentTextOutline, folderOutline, trashOutline } from "ionicons/icons";

import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable } from "@lib/util";

interface ContainerProps extends FileLike {
    /** Size of the item, in bytes */
    size?: number;
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isFile = props.type === "file";

    // States
    const router = useIonRouter();

    // Functions
    /**
     * Handles the user clicking on a directory item.
     */
    function onClickItem() {
        if (!isFile) {
            // Navigate into the directory
            router.push(`/files/${props.fullpath}`, "forward", "push");
            return;
        }

        // TODO: Handle file case
    }

    /**
     * Handles the user clicking the delete button on a directory item.
     *
     * Calls the {@link onDelete} callback with the path of the item and whether it is a directory.
     */
    async function onClickDelete() {
        await props.onDelete(props.fullpath, !isFile);
    }

    // Render
    return (
        <div className="flex h-16 w-full items-center">
            <IonItemSliding className="w-full">
                {/* Main item content */}
                <IonItem button={true} onClick={() => onClickItem()}>
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

                {/* Slide options */}
                <IonItemOptions>
                    <IonItemOption color="danger" onClick={() => onClickDelete()}>
                        <IonIcon slot="icon-only" icon={trashOutline}></IonIcon>
                    </IonItemOption>
                </IonItemOptions>
            </IonItemSliding>
        </div>
    );
};

export default DirectoryItem;
