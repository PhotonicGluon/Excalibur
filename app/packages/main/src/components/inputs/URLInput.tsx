import React, { HTMLProps, useState } from "react";

import { IonInput } from "@ionic/react";

import { useMount } from "@lib/hooks";
import { validateURL } from "@lib/url";

interface ContainerProps extends HTMLProps<HTMLIonInputElement> {
    label: string;
    defaultValue?: string;
}

const URLInput: React.FC<ContainerProps> = (props: ContainerProps) => {
    // States
    const [isTouched, setIsTouched] = useState(false);
    const [isValid, setIsValid] = useState<boolean>();

    // References
    const inputRef = React.useRef<HTMLIonInputElement>(null);

    // Functions
    /**
     * Validates the URL input.
     *
     * @param event The event
     */
    function validate(event: Event) {
        const value = (event.target as HTMLInputElement).value;

        setIsValid(undefined);
        if (value === "") {
            return;
        }

        if (validateURL(value)) {
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }

    /**
     * Marks the URL input as touched.
     */
    function markTouched() {
        setIsTouched(true);
    }

    // Effects
    useMount(() => {
        if (props.defaultValue && inputRef.current) {
            inputRef.current.value = props.defaultValue;
        }
    });

    // Render
    return (
        <IonInput
            ref={inputRef}
            id={props.id}
            className={`${isValid && "ion-valid"} ${isValid === false && "ion-invalid"} ${isTouched && "ion-touched"} ${props.className}`}
            label={props.label}
            labelPlacement="stacked"
            fill="solid"
            placeholder="https://example.com"
            errorText="Invalid URL"
            onIonInput={(event) => validate(event)}
            onIonBlur={() => markTouched()}
            onKeyDown={props.onKeyDown}
            disabled={props.disabled}
        ></IonInput>
    );
};

export default URLInput;
