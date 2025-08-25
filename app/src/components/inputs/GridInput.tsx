import React, { useEffect, useRef, useState } from "react";

import { IonCol, IonGrid, IonInput, IonRow } from "@ionic/react";

// This allows a parent to pass in a value and listen for changes.
interface ContainerProps {
    /** Value of the grid */
    value?: string;
    /** A callback that fires whenever the grid changes */
    onChange?: (value: string) => void;
    /** Whether the grid is disabled */
    disabled?: boolean;
}

const GridInput: React.FC<ContainerProps> = ({ value = "", onChange = () => {}, disabled }) => {
    // States
    const [inputs, setInputs] = useState<string[]>(Array(16).fill(""));
    const inputRefs = useRef<(HTMLIonInputElement | null)[]>([]);

    // Functions
    /**
     * Handles the change event of the grid input.
     *
     * @param index The input grid index
     * @param value The value of the input
     */
    function handleInputChange(index: number, value: string) {
        const sanitizedValue = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
        if (sanitizedValue.length > 4) {
            return;
        }
        const newInputs = [...inputs];
        newInputs[index] = sanitizedValue;
        onChange(newInputs.join(""));
    }

    /**
     * Handles the key up event of the grid input.
     *
     * @param e The event
     * @param index The input grid index
     */
    function handleKeyUp(e: React.KeyboardEvent<HTMLIonInputElement>, index: number) {
        const target = e.target as HTMLIonInputElement;
        const value = (target.value as string) || "";
        if (value.length === 4 && index < 15) {
            inputRefs.current[index + 1]?.setFocus();
        }
    }

    /**
     * Handles the key down event of the grid input.
     *
     * @param e The event
     * @param index The input grid index
     */
    function handleKeyDown(e: React.KeyboardEvent<HTMLIonInputElement>, index: number) {
        const target = e.target as HTMLIonInputElement;
        const value = (target.value as string) || "";

        // If the user is trying to paste, let the event proceed
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
            return;
        }

        // If the user is trying to navigate, let the event proceed
        if (e.key.length > 1 && e.key !== "Backspace") {
            return;
        }

        // Handle deletion
        if (e.key === "Backspace") {
            if (value === "" && index > 0) {
                inputRefs.current[index - 1]?.setFocus();
            }

            // Add a small timeout to allow the input value to update before notifying the parent
            setTimeout(() => {
                const currentValues = [...inputs];
                currentValues[index] = (target.value as string).replace(/[^0-9a-f]/gi, "").toUpperCase();
                onChange(currentValues.join(""));
            }, 0);
            return;
        }

        // Handle invalid input
        if (!/[0-9a-f]/i.test(e.key)) {
            e.preventDefault();
        }
    }

    /**
     * Handles pasting text into the grid.
     *
     * @param e The clipboard event
     * @param index The input grid index where the paste occurred
     */
    function handlePaste(e: React.ClipboardEvent<HTMLIonInputElement>, index: number) {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("text");
        if (!pastedText) return;

        const sanitizedText = pastedText.replace(/[^0-9a-f]/gi, "").toUpperCase();

        const newInputs = [...inputs];
        let remainingText = sanitizedText;

        // Distribute the pasted text into the subsequent boxes
        for (let i = index; i < 16 && remainingText.length > 0; i++) {
            const chunk = remainingText.substring(0, 4);
            newInputs[i] = chunk;
            remainingText = remainingText.substring(4);
        }

        // Notify the parent of the new full value
        onChange(newInputs.join(""));

        // Focus the last box that was pasted into
        setTimeout(() => {
            const lastAffectedIndex = Math.min(index + Math.ceil(sanitizedText.length / 4) - 1, 15);
            if (inputRefs.current[lastAffectedIndex]) {
                inputRefs.current[lastAffectedIndex]?.setFocus();
            }
        }, 0);
    }

    // Effects
    useEffect(() => {
        // Make sure internal state is in sync with props
        const newInputs = Array(16).fill("");
        const sanitizedValue = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
        for (let i = 0; i < 16; i++) {
            newInputs[i] = sanitizedValue.substring(i * 4, i * 4 + 4);
        }
        setInputs(newInputs);
    }, [value]);

    useEffect(() => {
        const refs = inputRefs.current;

        function handleBeforeInput(e: Event) {
            const event = e as InputEvent;
            if (!event.data) return;
            if (!/[0-9a-f]/i.test(event.data)) {
                event.preventDefault();
            }
        }

        for (const ref of refs) {
            if (ref) {
                ref.getInputElement().then((nativeInput) => {
                    nativeInput.addEventListener("beforeinput", handleBeforeInput);
                });
            }
        }

        return () => {
            for (const ref of refs) {
                if (ref) {
                    ref.getInputElement().then((nativeInput) => {
                        nativeInput.removeEventListener("beforeinput", handleBeforeInput);
                    });
                }
            }
        };
    }, []);

    // Render
    return (
        <IonGrid data-testid="grid-input">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
                <IonRow key={rowIndex} className="flex justify-center">
                    {Array.from({ length: 4 }).map((_, colIndex) => {
                        const index = rowIndex * 4 + colIndex;
                        return (
                            <IonCol key={index} size="3" className="p-1">
                                <IonInput
                                    fill="solid"
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    value={inputs[index]}
                                    maxlength={4}
                                    onIonChange={(e) => handleInputChange(index, e.detail.value!)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    onKeyUp={(e) => handleKeyUp(e, index)}
                                    onPaste={(e) => handlePaste(e, index)}
                                    style={{ "--border-radius": 0 }}
                                    className="!min-h-8 text-center !font-mono !text-xl uppercase [&_.input-wrapper]:!p-0"
                                    disabled={disabled}
                                />
                            </IonCol>
                        );
                    })}
                </IonRow>
            ))}
        </IonGrid>
    );
};

export default GridInput;
