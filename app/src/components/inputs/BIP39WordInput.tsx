import { useState } from "react";

import { IonItem, IonLabel, IonList, IonSearchbar } from "@ionic/react";

import { WORDS, WORD_TRIE } from "@lib/security/bip39";

export const DEBOUNCE_TIME = 100; // In ms
export const LOSS_FOCUS_CLEAR_DELAY = 100; // In ms

interface ContainerProps {
    /** Initial value to display */
    value?: string;
    /** Placeholder text to display in the input field */
    placeholder?: string;
    /** Maximum number of suggestions to display */
    maxSuggestions: number;
    /** Callback function to be called when a word is selected */
    onWordSelected: (word: string | null) => void;
}

const BIP39WordInput: React.FC<ContainerProps> = (props) => {
    // States
    const [searchText, setSearchText] = useState(props.value || "");
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [isSuggestionSelected, setIsSuggestionSelected] = useState(false);

    // Functions
    /**
     * Handles the change event of the input.
     *
     * @param e The event object
     */
    function handleInputChange(e: CustomEvent) {
        const newSearchText = e.detail.value || "";
        setSearchText(newSearchText);
        setIsSuggestionSelected(false);

        if (newSearchText.trim() === "") {
            setSuggestions(null);
            props.onWordSelected(null);
            return;
        }

        const foundWords = WORD_TRIE.findWords(newSearchText.toLowerCase());
        setSuggestions(foundWords.slice(0, props.maxSuggestions));
    }

    /**
     * Handles the click event of a suggestion.
     *
     * @param word The word of the suggestion
     */
    function handleSuggestionClick(word: string) {
        setSearchText(word);
        setSuggestions(null);
        setIsSuggestionSelected(true);
        props.onWordSelected(word);
    }

    /**
     * Handles the blur event of the input.
     *
     * @param e The blur event
     */
    function handleBlur(e: CustomEvent) {
        // Read value directly from the event target to avoid stale state
        const searchbarElement = e.target as HTMLIonSearchbarElement;
        const query = (searchbarElement.value || "").toLowerCase();

        if (query.trim() === "") {
            // If the input is empty on blur, ensure state is cleared
            if (searchText !== "") {
                setSearchText("");
                props.onWordSelected(null);
            }
            return;
        }

        if (WORDS.includes(query)) {
            // Synchronize the React state with the final valid word and call the callback
            setSearchText(searchbarElement.value || "");
            props.onWordSelected(query);
            setIsSuggestionSelected(true);
        } else if (!isSuggestionSelected) {
            // If text is not a valid word and no suggestion was clicked, clear input
            setSearchText("");
            props.onWordSelected(null);
        }

        // Hide suggestions when the input loses focus
        setTimeout(() => {
            setSuggestions(null);
        }, LOSS_FOCUS_CLEAR_DELAY);
    }

    // Render
    let listContents: React.ReactNode = (
        <IonItem>
            <IonLabel color="warning">No Matches</IonLabel>
        </IonItem>
    );
    if (suggestions && suggestions.length > 0) {
        listContents = suggestions.map((word) => (
            <IonItem key={word} onClick={() => handleSuggestionClick(word)} button>
                <IonLabel>{word}</IonLabel>
            </IonItem>
        ));
    }

    return (
        <div className="relative">
            <IonSearchbar
                className="!font-mono [&_.searchbar-search-icon]:!hidden [&_input]:!pr-8 [&_input]:!pl-4"
                value={searchText}
                placeholder={props.placeholder}
                onIonInput={handleInputChange}
                onIonBlur={handleBlur}
                debounce={DEBOUNCE_TIME}
            />
            {suggestions && (
                <IonList className="absolute z-10 w-30 rounded-md shadow-md shadow-black" lines="none">
                    {listContents}
                </IonList>
            )}
        </div>
    );
};

export default BIP39WordInput;
