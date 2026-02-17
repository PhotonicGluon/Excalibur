import { useState } from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonPage,
    IonSearchbar,
    IonToolbar,
    useIonRouter,
} from "@ionic/react";
import { arrowBack } from "ionicons/icons";

import { searchFiles } from "@lib/files/api";

import { useAuth } from "@components/auth/context";

export const DEBOUNCE_TIME = 250; // In ms
export const SEARCH_LIMIT = 10; // Number of results to return
export const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score for results to be returned

const Search: React.FC = () => {
    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [searchText, setSearchText] = useState("");

    // Functions
    /**
     * Handles the change event of the input.
     *
     * @param e The event object
     */
    async function handleInputChange(e: CustomEvent) {
        const newSearchText = e.detail.value || "";
        setSearchText(newSearchText);

        const query = newSearchText.trim();
        if (query === "") {
            return;
        }

        const results = await searchFiles(auth, query, SEARCH_LIMIT, SIMILARITY_THRESHOLD);
        console.log(results);
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
            <IonContent fullscreen></IonContent>
        </IonPage>
    );
};

export default Search;
