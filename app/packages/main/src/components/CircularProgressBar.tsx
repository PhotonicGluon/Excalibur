import { CircularProgressbar as CPB, buildStyles } from "react-circular-progressbar";

import { Color } from "@ionic/core";
import { IonSpinner } from "@ionic/react";

interface ContainerProps {
    /** CSS class to apply to the container */
    className?: string;
    /** Value of the progress bar (0-1), or null for indeterminate */
    value: number | null;
    /** Colour of the progress bar */
    colour?: Color;
    /** How long animation takes to go from one percentage to another, in seconds */
    transitionDuration?: number;
    /** ARIA label for the progress bar */
    ariaLabel?: string;
}

const CircularProgressBar: React.FC<ContainerProps> = (props) => {
    const colour = props.colour ?? "primary";

    let spinner;
    if (props.value === null) {
        spinner = <IonSpinner className="size-full" name="circular" color={colour}></IonSpinner>;
    } else {
        spinner = (
            <CPB
                className="size-full"
                value={props.value * 100}
                strokeWidth={13} // Magic number to closely match the IonSpinner
                styles={buildStyles({
                    pathTransitionDuration: props.transitionDuration,
                    pathColor: `var(--ion-color-${colour})`,
                    trailColor: `rgba(var(--ion-color-${colour}-rgb), 0.3)`,
                })}
            />
        );
    }

    return (
        <div
            className={(props.className ?? "") + " circular-progress-bar"}
            aria-label={props.ariaLabel}
            aria-valuenow={props.value ? props.value * 100 : undefined}
        >
            {spinner}
        </div>
    );
};

export default CircularProgressBar;
