import React, { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonList,
    IonModal,
    IonSearchbar,
    IonToolbar,
} from "@ionic/react";
import { close } from "ionicons/icons";

import { searchFiles } from "@lib/files/api";
import { File } from "@lib/files/structures";

import { useAuth } from "@components/auth/context";
import DirectoryItem from "@components/explorer/DirectoryItem";

export const DEBOUNCE_TIME = 300; // In ms
export const SEARCH_LIMIT = 5; // Number of results to return
export const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score for results to be returned

interface SearchDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const SearchDialog: React.FC<SearchDialogProps> = (props) => {
    // Contexts
    const auth = useAuth();

    // States
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState<{ file: File; similarity: number }[]>([]);

    // Functions
    /**
     * Handles the change event of the input.
     *
     * @param e The event object
     */
    async function handleInputChange(e: CustomEvent) {
        // Update search text
        const newSearchText = e.detail.value || "";
        setSearchText(newSearchText);

        // Get query
        const query = newSearchText.trim();
        if (query === "") {
            setSearchResults([]);
            return;
        }

        // Search for files
        const searchResponse = await searchFiles(auth, query, SEARCH_LIMIT, SIMILARITY_THRESHOLD);
        if (!searchResponse.success) {
            console.error(searchResponse.error);
            return;
        }
        setSearchResults(searchResponse.results!);
    }

    // Render
    return (
        <IonModal
            className="min-h-172 [--height:55%] [--width:min(24rem,90vw)]"
            id="search-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonContent className="flex h-172 flex-col">
                <IonHeader className="h-14">
                    <IonToolbar className="pt-0">
                        <IonSearchbar
                            value={searchText}
                            placeholder="Enter query here..."
                            onIonInput={handleInputChange}
                            debounce={DEBOUNCE_TIME}
                            disabled={false}
                            showClearButton={"always"}
                        />
                        <IonButtons slot="end">
                            <IonButton id="search-modal-close" onClick={props.onDidDismiss}>
                                <IonIcon size="large" icon={close} slot="icon-only" />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                {/* Items List */}
                <IonList lines="none" className="overflow-y-auto rounded-lg bg-transparent pt-0">
                    {searchResults.map(({ file, similarity: _similarity }, idx) => {
                        return (
                            <DirectoryItem
                                key={idx}
                                ellipsisMenuEnabled={false}
                                oddRow={idx % 2 === 0} // Treat row 0 as the first odd row
                                name={file.name}
                                fullpath={file.fullpath}
                                type={file.type}
                                mimetype={file.type === "file" ? file.mimetype : undefined}
                                size={file.type === "file" ? file.size : undefined}
                            />
                        );
                    })}
                </IonList>
            </IonContent>
        </IonModal>
    );
};

export default SearchDialog;
