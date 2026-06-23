import { useRef, useState } from "react";

import { IonButton } from "@ionic/react";

import { BIP39MnemonicLength, WORD_TRIE, fromMnemonic } from "@lib/auth/bip39";

import BIP39WordInput from "./BIP39WordInput";

interface ContainerProps {
    /** Number of words in the BIP39 mnemonic */
    numWords: BIP39MnemonicLength;
    /** Initial words to display */
    initialWords?: string[];
    /** Maximum number of suggestions to display */
    maxSuggestions: number;
    /** Function to call when the mnemonic is confirmed */
    onEntropy: (entropy: Buffer) => void;
    /** Function to call when an error occurs */
    onError: (error: Error) => void;
    /** Whether the input is disabled */
    disabled?: boolean;
}

const BIP39MnemonicInput: React.FC<ContainerProps> = (props) => {
    // States & Refs
    const [words, setWords] = useState<string[]>(
        props.initialWords || Array.from({ length: props.numWords }, () => ""),
    );
    const wordInputsRef = useRef<Map<number, HTMLIonSearchbarElement>>(null);

    // Functions
    /**
     * Gets the map of word inputs
     */
    function getWordInputsMap() {
        if (!wordInputsRef.current) {
            wordInputsRef.current = new Map();
        }
        return wordInputsRef.current;
    }

    /**
     * Handles the confirm button click
     */
    function handleConfirm() {
        // Check all words present
        if (words.some((word) => word === "")) {
            props.onError(new Error("All words must be present"));
            return;
        }

        // Validate mnemonic
        let entropy;
        try {
            entropy = fromMnemonic(words);
        } catch {
            // Likely invalid checksum
            props.onError(new Error("Invalid checksum for mnemonic"));
            return;
        }

        // Pass entropy back
        props.onEntropy(entropy);
    }

    /**
     * Handles pasting text into the mnemonic input
     *
     * @param e The clipboard event
     * @param index The input word index where the paste occurred
     */
    function handlePaste(e: React.ClipboardEvent<HTMLIonSearchbarElement>, index: number) {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("text").toLowerCase();
        if (!pastedText) return;
        const pastedWords = pastedText.split(" ");

        // Update words
        const newWords = [...words];
        let i = index;
        for (; i < Math.min(index + pastedWords.length, props.numWords); i++) {
            const currWord = pastedWords[i - index];
            if (!WORD_TRIE.has(currWord)) {
                continue;
            }
            newWords[i] = currWord;
        }
        setWords(newWords);

        // Move cursor to the last 'pasted' input
        // (We need setTimeout as otherwise the paste doesn't happen)
        setTimeout(() => {
            getWordInputsMap()
                .get(i - 1)!
                .setFocus();
        }, 0);
    }

    // Render
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: props.numWords }).map((_, index) => (
                    <BIP39WordInput
                        // Making the key depend on the word's value will make React destroy and re-create the
                        // component when the word changes (e.g., from a paste)
                        key={index + (words[index] ? words[index] : "")}
                        ref={(node) => {
                            const map = getWordInputsMap();
                            map.set(index, node!);
                            return () => {
                                map.delete(index);
                            };
                        }}
                        value={words[index]}
                        placeholder={`Word ${index + 1}`}
                        maxSuggestions={props.maxSuggestions}
                        onWordSelected={(word) => {
                            if (word === null) {
                                word = "";
                            }

                            const newWords = [...words];
                            newWords[index] = word;
                            setWords(newWords);
                        }}
                        onPaste={(e) => handlePaste(e, index)}
                        disabled={props.disabled}
                    />
                ))}
            </div>
            {!props.disabled && <IonButton onClick={handleConfirm}>Confirm</IonButton>}
        </div>
    );
};

export default BIP39MnemonicInput;
