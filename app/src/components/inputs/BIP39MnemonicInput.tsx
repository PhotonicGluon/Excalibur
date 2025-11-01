import { useState } from "react";

import { IonButton } from "@ionic/react";

import { BIP39MnemonicLength, fromMnemonic } from "@lib/security/bip39";

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
    // States
    const [words, setWords] = useState<string[]>(
        props.initialWords || Array.from({ length: props.numWords }, () => ""),
    );

    // Functions
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

    // Render
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2">
                {Array.from({ length: props.numWords }).map((_, index) => (
                    <BIP39WordInput
                        key={index}
                        value={props.initialWords?.[index]}
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
                        disabled={props.disabled}
                    />
                ))}
            </div>
            {!props.disabled && <IonButton onClick={handleConfirm}>Confirm</IonButton>}
        </div>
    );
};

export default BIP39MnemonicInput;
