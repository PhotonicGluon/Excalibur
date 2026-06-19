import { HTMLProps, useEffect, useState } from "react";

import { IonInput, IonInputPasswordToggle, IonLabel } from "@ionic/react";

import { useCapsLock } from "@lib/hooks";

interface ContainerProps extends HTMLProps<HTMLIonInputElement> {
    /** Whether to require confirmation of the password */
    confirmation?: boolean;
    /** Callback when password changes (or, if confirmation is true, when both passwords match) */
    onPasswordChange?: (password: string) => void;
}

const PasswordInput: React.FC<ContainerProps> = ({ confirmation, onPasswordChange, ...props }) => {
    // States
    const [password1, setPassword1] = useState("");
    const [isFirstInClear, setIsFirstInClear] = useState(false);

    const [password2, setPassword2] = useState("");

    // Hooks
    const capsLockOn = useCapsLock();

    // Values
    const secondPasswordDisabled = !confirmation || isFirstInClear;
    const passwordsMatch = !confirmation || isFirstInClear || password1 === password2;

    // Hooks
    useEffect(() => {
        if (passwordsMatch) {
            onPasswordChange?.(password1);
        }
    }, [onPasswordChange, password1, password2, passwordsMatch]);

    // Render
    return (
        <div className="flex flex-col gap-y-2">
            <IonInput
                label="Password"
                labelPlacement="stacked"
                fill="solid"
                placeholder="My secure password!"
                type={isFirstInClear ? "text" : "password"}
                onKeyDown={!confirmation ? props.onKeyDown : undefined}
                onIonInput={(e) => setPassword1(e.detail.value!)}
            >
                <IonInputPasswordToggle
                    slot="end"
                    onClick={() => {
                        setIsFirstInClear(!isFirstInClear);
                    }}
                />
            </IonInput>
            {confirmation && (
                <IonInput
                    label="Confirm Password"
                    labelPlacement="stacked"
                    fill="solid"
                    placeholder="My secure password!"
                    type="password"
                    onKeyDown={props.onKeyDown}
                    disabled={secondPasswordDisabled}
                    onIonInput={(e) => setPassword2(e.detail.value!)}
                >
                    <IonInputPasswordToggle slot="end" />
                </IonInput>
            )}
            <IonLabel color="danger" className="text-xs">
                {capsLockOn && "Caps Lock is on!"}
                {!secondPasswordDisabled && !passwordsMatch && "Passwords do not match!"}
            </IonLabel>
        </div>
    );
};

export default PasswordInput;
