import { IonLabel } from "@ionic/react";

import CircularProgressBar from "@components/CircularProgressBar";

/** Represents a job that is currently running */
export interface Job {
    /** Name of the file handled by the job */
    filename: string;
    /** Status of the job */
    status: string;
    /** Progress of the job.
     *
     * A `null` value means indeterminate progress.
     */
    progress: number | null;
}

// TODO: Add tests
const JobEntry: React.FC<Job> = (job) => {
    return (
        <div className="grid h-6 grid-cols-2 *:flex *:items-center">
            <div>
                <IonLabel className="max-w-40 truncate font-mono font-bold">{job.filename}</IonLabel>
            </div>
            <div>
                <IonLabel className="grow">{job.status}</IonLabel>
                <CircularProgressBar className="size-6" value={job.progress} />
            </div>
        </div>
    );
};

export default JobEntry;
