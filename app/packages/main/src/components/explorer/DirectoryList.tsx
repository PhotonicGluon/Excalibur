import { useState } from "react";

import { IonCol, IonContent, IonGrid, IonIcon, IonItem, IonLabel, IonList, IonRow, useIonPopover } from "@ionic/react";
import { alertCircleOutline, arrowDown, arrowUp, checkmark, checkmarkCircleOutline } from "ionicons/icons";

import { SortType } from "@lib/files/sorting";
import { Directory } from "@lib/files/structures";
import { useMount } from "@lib/hooks";
import Preferences from "@lib/preferences";

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
    const [sortType, setSortType] = useState<SortType>(SortType.NAME);
    const [sortAsc, setSortAsc] = useState(true);

    // Contexts
    const explorerContext = useExplorerContext();

    // Effects
    useMount(() => {
        // Get existing values from preferences
        Preferences.get("sortType").then((result) => {
            if (!result) return;
            console.debug(`Got existing sort type from preferences: ${result}`);
            setSortType(result as SortType);
        });
        Preferences.get("sortAsc").then((result) => {
            if (!result) return;
            console.debug(`Got existing sort asc from preferences: ${result}`);
            setSortAsc(result === "true");
        });
    });

    // Render
    const [showPopover, dismissPopover] = useIonPopover(SortOptionsPopover, {
        sortType: sortType,
        setSortType: (newSortType: SortType) => {
            setSortType(newSortType);
            Preferences.set({ sortType: newSortType });
        },
        sortAsc: sortAsc,
        setSortAsc: (newSortAsc: boolean) => {
            setSortAsc(newSortAsc);
            Preferences.set({ sortAsc: newSortAsc });
        },
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
                            <IonLabel>{sortType}</IonLabel>
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
                sortValues={{ sortType: sortType, sortAsc: sortAsc }}
            />
        </div>
    );
};

const SortOptionsPopover: React.FC<{
    sortType: SortType;
    setSortType: (sortType: SortType) => void;
    sortAsc: boolean;
    setSortAsc: (sortAsc: boolean) => void;
    onDismissPopover: () => void;
}> = ({ sortType, setSortType, sortAsc, setSortAsc, onDismissPopover }) => {
    let ascendingText;
    let descendingText;
    switch (sortType) {
        case SortType.NAME:
            ascendingText = "A to Z";
            descendingText = "Z to A";
            break;
        case SortType.SIZE:
            ascendingText = "Smallest to Largest";
            descendingText = "Largest to Smallest";
            break;
        case SortType.TYPE:
            ascendingText = "Normal";
            descendingText = "Reversed";
            break;
        case SortType.CREATION_TIME:
            ascendingText = "Old to New";
            descendingText = "New to Old";
            break;
    }

    return (
        <IonContent>
            <IonList lines="none" className="h-full">
                <IonItem className="-mb-2">
                    <IonLabel className="font-bold">Sort by</IonLabel>
                </IonItem>
                <IonList lines="none">
                    {Object.values(SortType).map((sortTypeValue) => (
                        <IonItem
                            key={sortTypeValue}
                            button={true}
                            onClick={() => {
                                setSortType(sortTypeValue);
                                onDismissPopover();
                            }}
                        >
                            <IonIcon
                                className="size-6 pr-2"
                                icon={sortType === sortTypeValue ? checkmark : undefined}
                            ></IonIcon>
                            <IonLabel>{sortTypeValue}</IonLabel>
                        </IonItem>
                    ))}
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
                        <IonLabel>{ascendingText}</IonLabel>
                    </IonItem>
                    <IonItem
                        button={true}
                        onClick={() => {
                            setSortAsc(false);
                            onDismissPopover();
                        }}
                    >
                        <IonIcon className="size-6 pr-2" icon={sortAsc ? undefined : checkmark}></IonIcon>
                        <IonLabel>{descendingText}</IonLabel>
                    </IonItem>
                </IonList>
            </IonList>
        </IonContent>
    );
};

export default DirectoryList;
