import { IonLabel } from "@ionic/react";

import JobEntry from "./JobEntry";
import { useJobsManager } from "./context";

const JobsList: React.FC = () => {
    const jobsManager = useJobsManager();

    return jobsManager.jobs.size > 0 ? (
        <div className="flex flex-col gap-2">
            {Array.from(jobsManager.jobs.entries()).map(([jobID, job]) => (
                <JobEntry key={jobID} {...job} onCancel={() => jobsManager.cancelJob(jobID)} />
            ))}
        </div>
    ) : (
        <IonLabel className="block h-6 text-center">No active jobs</IonLabel>
    );
};

export default JobsList;
