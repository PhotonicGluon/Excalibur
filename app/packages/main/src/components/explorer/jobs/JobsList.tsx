import { IonLabel } from "@ionic/react";

import JobEntry, { Job } from "./JobEntry";
import { useJobsManager } from "./context";

const JobsList: React.FC = () => {
    // Contexts
    const jobsManager = useJobsManager();

    // Functions
    /**
     * Assigns a rank to a job for comparison.
     * 
     * The ranks are assigned as follows:
     * 1. Jobs that are in-progress (but not indeterminate)
     * 2. Jobs that are indeterminate
     * 3. Jobs that have failed
     * 4. Jobs that have completed
     * 
     * @param job job to rank
     * @returns the job's rank
     */
    function _rankJob(job: Job): number {
        const progress = job.progress;

        if (typeof progress === "number") {
            return 1;
        }

        if (progress === null) {
            return 2;
        }

        if (!(progress as boolean)) {
            return 3;
        }

        return 4;
    }

    /**
     * Compares two jobs.
     * 
     * @param job1 first job
     * @param job2 second job
     * @returns -1 if the first job should go before the second, 1 if the second should go before
     *      the first, and 0 otherwise
     */
    function _compareJobs(job1: Job, job2: Job): -1 | 0 | 1 {
        const rank1 = _rankJob(job1);
        const rank2 = _rankJob(job2);

        if (rank1 < rank2) {
            return -1; // Job 1 should appear before job 2
        }
        if (rank1 > rank2) {
            return 1; // Job 2 should appear before job 1
        }
        return 0;
    }

    /**
     * Sorts a list of job entries.
     * 
     * @param entries an array of ID-job pairs
     * @returns the sorted array of ID-job pairs
     */
    function _sortJobs(entries: [string, Job][]): [string,Job][] {
        return entries.sort(([_id1, job1], [_id2, job2]) => _compareJobs(job1, job2));
    }

    // Render
    if (jobsManager.jobs.size === 0) {
        return <IonLabel className="block h-6 text-center">No active jobs</IonLabel>;
    }

    return (
        <div className="flex flex-col">
            {_sortJobs(Array.from(jobsManager.jobs.entries())).map(([jobID, job]) => (
                <JobEntry key={jobID} {...job} onCancel={() => jobsManager.cancelJob(jobID)} />
            ))}
        </div>
    );
};

export default JobsList;
