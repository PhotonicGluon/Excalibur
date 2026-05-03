import { IonIcon, IonLabel, IonList } from "@ionic/react";
import { sadOutline } from "ionicons/icons";

import { SortType, sortItems } from "@lib/files/sorting";
import { Directory, File } from "@lib/files/structures";
import { getParent } from "@lib/util";

import DirectoryItem, { ContainerProps as DirectoryItemProps } from "@components/explorer/DirectoryItem";

export const NUM_PENDING_ITEMS = 5; // Number of "skeleton" items to show when directory is null

interface ContainerProps {
    /** Additional CSS classes to apply to the list */
    className?: string;
    /** The path of the directory to display */
    path: string;
    /**
     * The directory's contents to display.
     *
     * If `null`, will interpret as pending content.
     */
    directory: Directory | null;
    /** The type of sorting to perform */
    sortType: SortType;
    /** Whether to sort in ascending order */
    sortAsc?: boolean;
    /** Optional override for the parent button click handler */
    onParentClickOverride?: (fullpath: string) => void;
    /** Optional override for the DirectoryItem props, depending on the item */
    directoryItemPropsOverride?: (item: File | Directory) => Partial<DirectoryItemProps>;
}

const DirectoryListRaw: React.FC<ContainerProps> = (props: ContainerProps) => {
    const hasParent = props.path !== ".";

    // Helper functions
    /**
     * @param idx The index of the item
     * @returns Whether the row at the given index is odd
     * @note We deem the row with index 0 as the first odd row, unless there is a parent navigation
     *      button, in which case it is even.
     */
    function isOddRow(idx: number) {
        return idx % 2 === (hasParent ? 1 : 0);
    }

    // Render
    let MainBody: React.ReactNode;
    if (props.directory === null) {
        MainBody = Array.from({ length: NUM_PENDING_ITEMS }).map((_, idx) => (
            <DirectoryItem key={idx} oddRow={isOddRow(idx)}></DirectoryItem>
        ));
    } else if (props.directory.items && props.directory.items.length > 0) {
        MainBody = sortItems(props.directory, props.sortType, props.sortAsc).map((item, idx) => (
            <DirectoryItem
                key={idx}
                oddRow={isOddRow(idx)}
                name={item.name}
                creation_time={item.creation_time}
                fullpath={item.fullpath}
                type={item.type}
                size={item.type === "file" ? item.size : undefined}
                {...(props.directoryItemPropsOverride ? props.directoryItemPropsOverride(item) : {})}
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
        <IonList
            lines="none"
            className={
                "overflow-y-auto rounded-lg bg-transparent pt-0" + (props.className ? " " + props.className : "")
            }
        >
            {hasParent && (
                <DirectoryItem
                    oddRow={true}
                    name="(Go Back)"
                    fullpath={getParent(props.path)}
                    type="parent"
                    onClickItemOverride={props.onParentClickOverride}
                ></DirectoryItem>
            )}
            {MainBody}
        </IonList>
    );
};

export default DirectoryListRaw;
