import { useCallback } from "react";
import { useImmer } from "use-immer";

import { Job } from "@components/explorer/jobs/JobEntry";
import { JobsManager, jobsContext } from "@components/explorer/jobs/context";

export const ProvideJobs: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const jobsManager = useProvideJobsManager();
    return <jobsContext.Provider value={jobsManager}>{children}</jobsContext.Provider>;
};

/**
 * React hook that provides access to job management functionality.
 *
 * @returns Jobs manager
 */
function useProvideJobsManager(): JobsManager {
    const [jobs, updateJobs] = useImmer<Map<string, Job>>(new Map());

    const getJob = useCallback(
        (id: string): Job => {
            return jobs.get(id)!;
        },
        [jobs],
    );

    const addJob = useCallback(
        (id: string, job: Job): void => {
            updateJobs((draft) => {
                draft.set(id, job);
            });
        },
        [updateJobs],
    );

    const updateJob = useCallback(
        (id: string, newStatus: string, newProgress?: number | null, newWorker?: Worker): void => {
            updateJobs((draft) => {
                const job = draft.get(id);
                if (!job) {
                    // We will fail semi-silently
                    console.warn(`Job ${id} not found for job update`);
                    return;
                }
                job.description = newStatus;
                if (newProgress !== undefined) {
                    job.progress = newProgress;
                }
                if (newWorker) {
                    job.worker = newWorker;
                }
            });
        },
        [updateJobs],
    );

    const updateProgress = useCallback(
        (id: string, newProgress: number | null): void => {
            updateJobs((draft) => {
                const job = draft.get(id);
                if (!job) {
                    // We will fail semi-silently
                    console.warn(`Job ${id} not found for progress update`);
                    return;
                }
                job.progress = newProgress;
            });
        },
        [updateJobs],
    );

    const cancelJob = useCallback(
        (id: string): void => {
            updateJobs((draft) => {
                const job = draft.get(id);
                if (!job) {
                    console.warn(`Job ${id} not found for job cancelling`);
                    return;
                }
                console.debug(`Cancelling job '${id}'`);

                job.controller!.abort();
                if (job.worker) {
                    job.worker.terminate();
                }

                draft.delete(id);
            });
        },
        [updateJobs],
    );

    const deleteJob = useCallback(
        (id: string): void => {
            updateJobs((draft) => {
                draft.delete(id);
            });
        },
        [updateJobs],
    );

    const clearComplete = useCallback(() => {
        updateJobs((draft) => {
            for (const [id, job] of draft) {
                if (job.progress === true || job.progress === false) {
                    draft.delete(id);
                }
            }
        });
    }, [updateJobs]);

    return { jobs, addJob, getJob, updateJob, updateProgress, cancelJob, deleteJob, clearComplete };
}
