import { Capacitor } from "@capacitor/core";

import { IonIcon, IonLabel } from "@ionic/react";
import { arrowDown, arrowUp, closeCircleOutline } from "ionicons/icons";

import CircularProgressBar from "@components/CircularProgressBar";

/** Represents the details of a running job */
interface JobDetails {
    /** Direction of the job */
    direction: "upload" | "download";
    /** Name of the file handled by the job */
    filename: string;
    /** Description of the job */
    description: string;
    /**
     * Progress of the job.
     *
     * Is either a number from 0 to 1 or a null value (indeterminate).
     */
    progress: number | null;
}

export interface Job extends JobDetails {
    /** Controller used to abort the job */
    controller?: AbortController;
    /** Worker used to handle crypto operations */
    worker?: Worker; // Defined as optional as it will be set mid-operation
}

interface ContainerProps extends Job {
    /** Function to call when the job is cancelled */
    onCancel: () => void;
}

const JobEntry: React.FC<ContainerProps> = (props) => {
    return (
        <div className="grid h-6 grid-cols-2">
            <div className="flex items-center gap-1">
                <IonIcon icon={props.direction === "upload" ? arrowUp : arrowDown} className="size-4"></IonIcon>
                <IonLabel className="max-w-36 truncate font-mono font-bold" title={props.filename}>
                    {props.filename}
                </IonLabel>
            </div>
            <div className="flex items-center">
                <IonLabel className="grow">{props.description}</IonLabel>
                <div
                    className="group relative size-6 *:absolute *:top-0 *:left-0 *:size-full hover:cursor-pointer"
                    onClick={() => props.onCancel()}
                >
                    <CircularProgressBar value={props.progress} />
                    <IonIcon
                        icon={closeCircleOutline}
                        className={
                            "-z-10 transition-opacity duration-100 group-hover:opacity-100 " +
                            (Capacitor.isNativePlatform() ? "opacity-100" : "opacity-0")
                        }
                    ></IonIcon>
                </div>
            </div>
        </div>
    );
};

export default JobEntry;
