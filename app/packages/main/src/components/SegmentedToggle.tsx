import React from "react";

import { IonIcon } from "@ionic/react";
import { checkmark } from "ionicons/icons";

interface ContainerProps<T extends string> {
    /** Additional CSS classes */
    className?: string;

    /** The two values */
    values: [T, T];

    /** The default value */
    defaultValue?: T;

    /** The nodes to display for each value */
    displayNodes: [React.ReactNode, React.ReactNode];

    /** Callback when the value is changed */
    onChange: (value: T) => void;
}

function SegmentedToggle<T extends string>(props: ContainerProps<T>) {
    // States
    const [value, setValue] = React.useState<T>(props.defaultValue || props.values[0]);

    // Functions
    /**
     * Handler for when the value is changed.
     *
     * @param value the new value
     */
    function onChange(value: T) {
        setValue(value);
        props.onChange?.(value);
    }

    // Render
    return (
        <div
            className={
                "inline-flex rounded-full text-sm leading-none *:inline-flex *:min-w-12 *:items-center *:justify-center *:border *:border-(--ion-color-dark) *:text-(--ion-color-dark) *:transition-colors *:duration-100 *:ease-in " +
                props.className
            }
        >
            <button
                className={
                    "rounded-l-full " +
                    (value === props.values[0]
                        ? "bg-(--ion-color-primary)/50 text-(--ion-color-primary-contrast) hover:bg-(--ion-color-primary)"
                        : "bg-transparent hover:bg-(--ion-color-light)")
                }
                onClick={() => onChange(props.values[0])}
                aria-selected={value === props.values[0]}
            >
                {value === props.values[0] && <IonIcon icon={checkmark} />}
                {props.displayNodes[0]}
            </button>
            <button
                className={
                    "-ml-px rounded-r-full " +
                    (value === props.values[1]
                        ? "bg-(--ion-color-primary)/50 text-(--ion-color-primary-contrast) hover:bg-(--ion-color-primary)"
                        : "bg-transparent hover:bg-(--ion-color-light)")
                }
                onClick={() => onChange(props.values[1])}
                aria-selected={value === props.values[1]}
            >
                {value === props.values[1] && <IonIcon icon={checkmark} />}
                {props.displayNodes[1]}
            </button>
        </div>
    );
}

export default SegmentedToggle;
