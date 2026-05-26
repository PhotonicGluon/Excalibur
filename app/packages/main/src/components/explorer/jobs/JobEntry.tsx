import { Capacitor } from "@capacitor/core";

import { IonIcon, IonLabel, IonNote, IonThumbnail } from "@ionic/react";
import { arrowDown, arrowUp, closeCircleOutline } from "ionicons/icons";

import CircularProgressBar from "@components/CircularProgressBar";

/** Represents the details of a running job */
interface JobDetails {
    /** Direction of the job */
    direction: "upload" | "download";
    /** Name of the file handled by the job */
    name: string;
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
        <div className="flex h-16 w-full min-w-72">
            <div className="flex grow items-center">
                <IonThumbnail className="size-6">
                    <IonIcon icon={props.direction === "upload" ? arrowUp : arrowDown} className="size-full"></IonIcon>
                </IonThumbnail>
                <div className="pl-4 *:block">
                    <IonLabel className="max-w-56 truncate" color="dark" title={props.name}>
                        {props.name}
                    </IonLabel>
                    <IonNote className="text-sm" color="medium">
                        {props.description}
                    </IonNote>
                </div>
            </div>
            <div className="flex items-center">
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
