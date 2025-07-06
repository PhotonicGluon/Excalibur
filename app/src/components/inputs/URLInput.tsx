import React, { useEffect, useState } from "react";

import { IonInput } from "@ionic/react";

import { validateURL } from "@lib/validators";

interface ContainerProps {
    label: string;
    class?: string;
    value?: string;
}

const URLInput: React.FC<ContainerProps> = (props: ContainerProps) => {
    // States
    const [inputValue, setInputValue] = useState("");

    const [isTouched, setIsTouched] = useState(false);
    const [isValid, setIsValid] = useState<boolean>();

    // Functions
    /**
     * Validates the URL input.
     *
     * @param event The event
     */
    function validate(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        setInputValue(value);

        setIsValid(undefined);
        if (value === "") {
            return;
        }
        validateURL(value) ? setIsValid(true) : setIsValid(false);
    }

    /**
     * Marks the URL input as touched.
     */
    function markTouched() {
        setIsTouched(true);
    }

    // Effects
    useEffect(() => {
        if (props.value) {
            setInputValue(props.value);
        }
    }, [props.value]);

    // Render
    return (
        <IonInput
            className={`${isValid && "ion-valid"} ${isValid === false && "ion-invalid"} ${isTouched && "ion-touched"} ${props.class}`}
            label={props.label}
            labelPlacement="stacked"
            fill="solid"
            placeholder="https://example.com"
            errorText="Invalid URL"
            onIonInput={(event) => validate(event)}
            onIonBlur={() => markTouched()}
            value={inputValue}
        ></IonInput>
    );
};

export default URLInput;
