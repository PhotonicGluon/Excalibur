import { useEffect, useState } from "react";

/**
 * React hook that checks whether the caps lock is enabled.
 *
 * @returns a boolean indicating whether the caps lock is enabled
 */
export const useCapsLock = () => {
    const [capsLockOn, setCapsLockOn] = useState(false); // Initial keypress will update this state correctly

    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            setCapsLockOn(e.getModifierState("CapsLock"));
        };

        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);

    return capsLockOn;
};
