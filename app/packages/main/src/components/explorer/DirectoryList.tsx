import { useState } from "react";

import { IonCol, IonGrid, IonIcon, IonLabel, IonRow } from "@ionic/react";
import { alertCircleOutline, arrowDown, arrowUp, checkmarkCircleOutline } from "ionicons/icons";

import { Directory } from "@lib/files/structures";

import DirectoryListRaw from "./DirectoryListRaw";
import { useExplorerContext } from "./context";

interface ContainerProps {
    /** The ID of the directory list */
    id?: string;
    /**
     * The directory's contents to display.
     *
     * If `null`, will interpret as pending content.
     */
    directory: Directory | null;
    /** Whether the directory listener is connected */
    listenerConnected: boolean;
}

const DirectoryList: React.FC<ContainerProps> = (props: ContainerProps) => {
    // States
    const [sortAsc, setSortAsc] = useState(true);

    // Contexts
    const explorerContext = useExplorerContext();

    // Render
    return (
        <div id={props.id}>
            {/* Sorting Buttons */}
            <IonGrid className="pb-1">
                <IonRow className="ion-align-items-center">
                    <IonCol className="ml-2 flex items-center font-bold">
                        <div className="flex items-center hover:cursor-pointer" onClick={() => setSortAsc(!sortAsc)}>
                            <IonLabel>Name</IonLabel>
                            <IonIcon className="ml-1 size-6" icon={sortAsc ? arrowUp : arrowDown} />
                        </div>
                    </IonCol>
                    {props.directory && props.directory.items && (
                        <IonCol
                            id={`${props.id ?? "directory-list"}-stats`}
                            className="flex items-center justify-end gap-1 pr-2"
                        >
                            <IonLabel color="medium" className="text-sm">
                                {props.directory.items.length} Item
                                {props.directory.items.length !== 1 ? "s" : ""}
                            </IonLabel>
                            <IonIcon
                                color="medium"
                                icon={props.listenerConnected ? checkmarkCircleOutline : alertCircleOutline}
                                aria-label={props.listenerConnected ? "Listener connected" : "Listener disconnected"}
                            />
                        </IonCol>
                    )}
                </IonRow>
            </IonGrid>

            {/* Items List */}
            <DirectoryListRaw
                className="h-[calc(80vh-4rem)]"
                path={explorerContext.path}
                directory={props.directory}
                sortAsc={sortAsc}
            />
        </div>
    );
};

export default DirectoryList;
