import { useState } from "react";

import { IonCol, IonGrid, IonIcon, IonLabel, IonList, IonRow } from "@ionic/react";
import { arrowDown, arrowUp, sadOutline } from "ionicons/icons";

import DirectoryItem from "@components/explorer/DirectoryItem";
import { Directory, FileLike } from "@lib/files/structures";
import { getParent } from "@lib/util";
import naturalCompare from "natural-compare-lite";

import { useExplorerContext } from "./context";

export const NUM_PENDING_ITEMS = 5; // Number of "skeleton" items to show when directory is null

interface ContainerProps {
    /** The ID of the directory list */
    id?: string;
    /**
     * The directory to display.
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

    // Functions
    /**
     * Sorts the {@link FileLike} items in the directory.
     *
     * Directories are prioritized over files. Items of the same type are sorted alphabetically
     * by name. The sort order can be ascending or descending based on the `sortAsc` state.
     *
     * @returns A sorted array of `FileLike` items. Will be an empty array if `items` is `null` or
     *      empty.
     */
    function sortItems() {
        if (!props.directory || !props.directory.items || props.directory.items.length === 0) {
            return [];
        }

        const items = props.directory.items;

        function sortFunc(a: FileLike, b: FileLike): number {
            // Directories come before files
            if (a.type === "directory" && b.type === "file") {
                return -1;
            } else if (a.type === "file" && b.type === "directory") {
                return 1;
            }

            // Otherwise, since they are of the same type, sort by name using 'natural' ordering
            const sortVal = naturalCompare(a.name, b.name);
            return sortAsc ? sortVal : -sortVal;
        }

        return items.sort(sortFunc);
    }

    // Render
    const path = explorerContext.path;
    const hasParent = path !== ".";

    let MainBody: React.ReactNode;
    if (props.directory === null) {
        MainBody = Array.from({ length: NUM_PENDING_ITEMS }).map((_, idx) => (
            <DirectoryItem
                key={idx}
                oddRow={idx % 2 === (hasParent ? 1 : 0)} // Treat row 0 as the first odd row
            ></DirectoryItem>
        ));
    } else if (props.directory.items && props.directory.items.length > 0) {
        MainBody = sortItems().map((item, idx) => (
            <DirectoryItem
                key={idx}
                oddRow={idx % 2 === (hasParent ? 1 : 0)} // Treat row 0 as the first odd row
                name={item.name}
                fullpath={item.fullpath}
                type={item.type}
                mimetype={item.type === "file" ? item.mimetype : undefined}
                size={item.type === "file" ? item.size : undefined}
            />
        ));
    } else {
        MainBody = (
            <div className="mt-4 flex justify-center">
                <div className="flex flex-col items-center">
                    <IonIcon icon={sadOutline} className="size-16 pb-1"></IonIcon>
                    <IonLabel className="text-lg">No items</IonLabel>
                </div>
            </div>
        );
    }

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
                </IonRow>
            </IonGrid>

            {/* Items List */}
            <IonList lines="none" className="h-[calc(80vh-4rem)] overflow-y-auto rounded-lg bg-transparent pt-0">
                {hasParent && (
                    <DirectoryItem
                        oddRow={true}
                        name="(Go Back)"
                        fullpath={getParent(path)}
                        type="parent"
                    ></DirectoryItem>
                )}
                {MainBody}
            </IonList>
        </div>
    );
};

export default DirectoryList;
