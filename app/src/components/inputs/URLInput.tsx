import React, { useState } from "react";
import { IonInput } from "@ionic/react";

import { validateURL } from "@lib/validators";

interface ContainerProps {
    label: string;
    class?: string;
}

const URLInput: React.FC<ContainerProps> = (props: ContainerProps) => {
    const [isTouched, setIsTouched] = useState(false);
    const [isValid, setIsValid] = useState<boolean>();

    function validate(event: Event) {
        const value = (event.target as HTMLInputElement).value;

        setIsValid(undefined);

        if (value === "") return;

        validateURL(value) ? setIsValid(true) : setIsValid(false);
    }

    const markTouched = () => {
        setIsTouched(true);
    };

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
        ></IonInput>
    );
};

export default URLInput;
