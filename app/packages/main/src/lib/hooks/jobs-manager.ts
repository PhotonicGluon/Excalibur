import { useMemo } from "react";
import { useImmer } from "use-immer";

import { Job } from "@components/explorer/JobEntry";
import { JobsManager } from "@components/explorer/context";

/**
 * React hook that provides access to job management functionality.
 *
 * @returns Object containing the current jobs and a manager for the jobs
 */
export function useJobsManager(): { jobs: Map<string, Job>; jobsManager: JobsManager } {
    const [jobs, updateJobs] = useImmer<Map<string, Job>>(new Map());
    const jobsManager: JobsManager = useMemo(() => {
        return {
            getJob(id: string): Job {
                return jobs.get(id)!;
            },
            addJob(id: string, job: Job): void {
                updateJobs((draft) => {
                    draft.set(id, job);
                });
            },
            updateJob(id: string, newStatus: string, newProgress?: number | null, newWorker?: Worker): void {
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
            updateProgress(id: string, newProgress: number | null): void {
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
            cancelJob(id: string): void {
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
            deleteJob(id: string): void {
                updateJobs((draft) => {
                    draft.delete(id);
                });
            },
        };
    }, [jobs, updateJobs]);

    return { jobs, jobsManager };
}
