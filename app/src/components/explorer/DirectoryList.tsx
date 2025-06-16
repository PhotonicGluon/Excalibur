import { useState } from "react";

import { IonCol, IonGrid, IonIcon, IonLabel, IonList, IonRow } from "@ionic/react";
import { arrowDown, arrowUp, sadOutline } from "ionicons/icons";

import { Directory, FileLike } from "@lib/files/structures";

import DirectoryItem from "@components/explorer/DirectoryItem";

interface ContainerProps extends Omit<Directory, "fullpath"> {
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
}

const DirectoryList: React.FC<ContainerProps> = (props: ContainerProps) => {
    // States
    const [sortAsc, setSortAsc] = useState(true);

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
        const items = props.items;
        if (!items || items.length === 0) {
            return [];
        }

        function sortFunc(a: FileLike, b: FileLike): number {
            // Directories come before files
            if (a.type === "directory" && b.type === "file") {
                return -1;
            } else if (a.type === "file" && b.type === "directory") {
                return 1;
            }

            // Otherwise, since they are of the same type, sort by name
            const sortVal = a.name.localeCompare(b.name);
            return sortAsc ? sortVal : -sortVal;
        }

        return items.sort(sortFunc);
    }

    // Render
    return (
        <>
            {/* Sorting Buttons */}
            <IonGrid>
                <IonRow className="ion-align-items-center">
                    <IonCol className="flex items-center pl-4 font-bold">
                        <div className="flex items-center hover:cursor-pointer" onClick={() => setSortAsc(!sortAsc)}>
                            <IonLabel>Name</IonLabel>
                            <IonIcon className="size-6 pl-1" icon={sortAsc ? arrowUp : arrowDown} />
                        </div>
                    </IonCol>
                </IonRow>
            </IonGrid>

            {/* Items List */}
            <IonList lines="none">
                {props.items &&
                    props.items.length > 0 &&
                    sortItems().map((item, idx) => (
                        <DirectoryItem
                            key={idx}
                            name={item.name}
                            fullpath={item.fullpath}
                            type={item.type}
                            size={item.type === "file" ? item.size : undefined}
                            onDelete={props.onDelete}
                        />
                    ))}
                {!(props.items && props.items.length > 0) && (
                    <div className="flex justify-center">
                        <div className="flex flex-col items-center">
                            <IonIcon icon={sadOutline} className="size-16 pb-1"></IonIcon>
                            <IonLabel className="text-lg">No items</IonLabel>
                        </div>
                    </div>
                )}
            </IonList>
        </>
    );
};

export default DirectoryList;
