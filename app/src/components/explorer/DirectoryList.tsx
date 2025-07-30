import { useState } from "react";

import { IonCol, IonGrid, IonIcon, IonLabel, IonList, IonRow } from "@ionic/react";
import { arrowDown, arrowUp, sadOutline } from "ionicons/icons";

import { Directory, FileLike } from "@lib/files/structures";

import DirectoryItem from "@components/explorer/DirectoryItem";
import { UIFeedbackMethods } from "@components/explorer/types";

interface ContainerProps extends Omit<Directory, "fullpath"> {
    /** Methods for UI feedback */
    feedbackMethods: UIFeedbackMethods;
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
            <IonGrid className="!pb-1">
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
            <IonList lines="none" className="!bg-transparent !pt-0">
                {props.items &&
                    props.items.length > 0 &&
                    sortItems().map((item, idx) => (
                        <DirectoryItem
                            key={idx}
                            oddRow={idx % 2 === 0} // Treat row of index 0 as the first odd row
                            name={item.name}
                            fullpath={item.fullpath}
                            type={item.type}
                            mimetype={item.type === "file" ? item.mimetype : undefined}
                            size={item.type === "file" ? item.size : undefined}
                            feedbackMethods={props.feedbackMethods}
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
