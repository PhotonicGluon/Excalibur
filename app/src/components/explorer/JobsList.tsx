import { IonLabel } from "@ionic/react";

import JobEntry, { Job } from "./JobEntry";

interface ContainerProps {
    /** Jobs to display */
    jobs: Map<string, Job>;
    /** Function to call when a job is cancelled */
    onCancelJob: (jobId: string) => void;
}

const JobsList: React.FC<ContainerProps> = (props) => {
    return props.jobs.size > 0 ? (
        <div className="flex flex-col gap-2">
            {Array.from(props.jobs.entries()).map(([jobId, job]) => (
                <JobEntry key={jobId} {...job} onCancel={() => props.onCancelJob(jobId)} />
            ))}
        </div>
    ) : (
        <IonLabel className="block h-6 text-center">No active jobs</IonLabel>
    );
};

export default JobsList;
