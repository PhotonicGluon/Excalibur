import { useState } from "react";

import { IonCol, IonContent, IonGrid, IonIcon, IonItem, IonLabel, IonList, IonRow, useIonPopover } from "@ionic/react";
import { alertCircleOutline, arrowDown, arrowUp, checkmark, checkmarkCircleOutline } from "ionicons/icons";

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

const SortOptionsPopover: React.FC<{
    sortAsc: boolean;
    setSortAsc: (sortAsc: boolean) => void;
    onDismissPopover: () => void;
}> = ({ sortAsc, setSortAsc, onDismissPopover }) => (
    <IonContent>
        <IonList lines="none" className="h-full">
            <IonItem className="-mb-2">
                <IonLabel className="font-bold">Sort by</IonLabel>
            </IonItem>
            <IonList lines="none">
                {/* TODO: Add other sort options */}
                <IonItem
                    button={true}
                    onClick={() => {
                        console.log("Sorting by name");
                        onDismissPopover();
                    }}
                >
                    <IonIcon className="size-6 pr-2" icon={checkmark}></IonIcon>
                    <IonLabel>Name</IonLabel>
                </IonItem>
            </IonList>
            <hr className="my-0 bg-neutral-400 dark:bg-neutral-500" />
            <IonList lines="none">
                <IonItem
                    button={true}
                    onClick={() => {
                        setSortAsc(true);
                        onDismissPopover();
                    }}
                >
                    <IonIcon className="size-6 pr-2" icon={sortAsc ? checkmark : undefined}></IonIcon>
                    <IonLabel>A to Z {/* TODO: Customize label */}</IonLabel>
                </IonItem>
                <IonItem
                    button={true}
                    onClick={() => {
                        setSortAsc(false);
                        onDismissPopover();
                    }}
                >
                    <IonIcon className="size-6 pr-2" icon={sortAsc ? undefined : checkmark}></IonIcon>
                    <IonLabel>Z to A {/* TODO: Customize label */}</IonLabel>
                </IonItem>
            </IonList>
        </IonList>
    </IonContent>
);

const DirectoryList: React.FC<ContainerProps> = (props: ContainerProps) => {
    // States
    const [sortAsc, setSortAsc] = useState(true);

    // Contexts
    const explorerContext = useExplorerContext();

    // Render
    const [showPopover, dismissPopover] = useIonPopover(SortOptionsPopover, {
        sortAsc: sortAsc,
        setSortAsc: setSortAsc,
        onDismissPopover: () => dismissPopover(),
    });
    return (
        <div id={props.id}>
            {/* Sorting Buttons */}
            <IonGrid className="pb-1">
                <IonRow className="ion-align-items-center">
                    <IonCol className="ml-2 flex items-center font-bold">
                        <div
                            className="flex items-center hover:cursor-pointer"
                            onClick={(e) => showPopover({ event: e.nativeEvent, reference: "event", side: "bottom" })}
                        >
                            <IonLabel>Name</IonLabel>
                            <IonIcon
                                className="ml-1 size-4 rounded-full bg-blue-500/50 p-1"
                                icon={sortAsc ? arrowUp : arrowDown}
                            />
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
