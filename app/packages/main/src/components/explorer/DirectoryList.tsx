import { useState } from "react";

import { IonCol, IonGrid, IonIcon, IonLabel, IonRow } from "@ionic/react";
import { arrowDown, arrowUp } from "ionicons/icons";

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
                        <IonCol className="flex items-center justify-end pr-2">
                            <IonLabel color="medium" className="text-sm">
                                {props.directory.items.length} Item
                                {props.directory.items.length !== 1 ? "s" : ""}
                            </IonLabel>
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
