import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonList,
    IonPage,
    IonSearchbar,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { searchFiles } from "@lib/files/api";
import { File } from "@lib/files/structures";

import { useAuth } from "@components/auth/context";
import DirectoryItem from "@components/explorer/DirectoryItem";

export const DEBOUNCE_TIME = 300; // In ms
export const SEARCH_LIMIT = 10; // Number of results to return
export const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score for results to be returned

const Search: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

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
        <IonPage>
            {/* Header content */}
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
                    <IonButtons slot="start">
                        <IonButton onClick={() => router.goBack()}>
                            <IonIcon className="size-6" slot="icon-only" icon={arrowBack} />
                        </IonButton>
                    </IonButtons>
                    <IonSearchbar
                        value={searchText}
                        placeholder="Enter query here..."
                        onIonInput={handleInputChange}
                        debounce={DEBOUNCE_TIME}
                        disabled={false}
                        showClearButton={"always"}
                    />
                </IonToolbar>
            </IonHeader>

            {/* Body content */}
            <IonContent fullscreen>
                {/* Items List */}
                <IonList lines="none" className="overflow-y-auto rounded-lg bg-transparent pt-0">
                    {/* TODO: Allow downloading */}
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
        </IonPage>
    );
};

export default Search;
