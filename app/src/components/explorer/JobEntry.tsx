import { IonIcon, IonLabel } from "@ionic/react";
import { arrowDown, arrowUp } from "ionicons/icons";

import CircularProgressBar from "@components/CircularProgressBar";

/** Represents a job that is currently running */
export interface Job {
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

const JobEntry: React.FC<Job> = (job) => {
    return (
        <div className="grid h-6 grid-cols-2">
            <div className="flex max-w-40 items-center gap-1">
                <IonIcon icon={job.direction === "upload" ? arrowUp : arrowDown} className="size-4"></IonIcon>
                <IonLabel className="truncate font-mono font-bold">{job.filename}</IonLabel>
            </div>
            <div className="flex items-center">
                <IonLabel className="grow">{job.description}</IonLabel>
                <CircularProgressBar className="size-6" value={job.progress} />
            </div>
        </div>
    );
};

export default JobEntry;
