import { HTMLProps, useEffect, useState } from "react";

import { IonInput, IonInputPasswordToggle, IonLabel } from "@ionic/react";

import { useCapsLock } from "@lib/hooks";

interface ContainerProps extends HTMLProps<HTMLIonInputElement> {
    /** Whether to require confirmation of the password */
    confirmation?: boolean;
    /** Callback when password changes (or, if confirmation is true, when both passwords match) */
    onPasswordChange?: (password: string) => void;
}

const PasswordInput: React.FC<ContainerProps> = ({ confirmation, onPasswordChange, value, ...props }) => {
    // States
    const [password1, setPassword1] = useState((value as string) ?? "");
    const [password2, setPassword2] = useState((value as string) ?? "");
    const [prevValue, setPrevValue] = useState<string | undefined>(value as string);

    const [isFirstInClear, setIsFirstInClear] = useState(false);

    // Hooks
    const capsLockOn = useCapsLock();

    // Values
    const secondPasswordDisabled = !confirmation || isFirstInClear;
    const passwordsMatch = !confirmation || isFirstInClear || password1 === password2;

    // State updates
    if (value !== prevValue) {
        setPrevValue(value as string);
        setPassword1((value as string) ?? "");
        setPassword2((value as string) ?? "");
    }

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
                value={password1}
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
                    disabled={secondPasswordDisabled}
                    value={password2}
                    onKeyDown={props.onKeyDown}
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
