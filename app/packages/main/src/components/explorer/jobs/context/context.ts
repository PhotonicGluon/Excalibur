import { createContext, useContext } from "react";

import { Job } from "@components/explorer/jobs/JobEntry";

/**
 * Manages jobs and their states.
 */
export interface JobsManager {
    jobs: Map<string, Job>;
    addJob(id: string, job: Job): void;
    getJob(id: string): Job;
    updateJob(id: string, newStatus: string, newProgress?: number | null | boolean, newWorker?: Worker): void;
    updateProgress(id: string, newProgress: number | null | boolean): void;
    cancelJob(id: string): void;
    deleteJob(id: string): void;
    clearComplete(): void;
}

export const jobsContext = createContext<JobsManager>(null!);

/**
 * Hook to get the current jobs and their related management methods.
 *
 * @returns The current jobs manager
 */
export function useJobsManager(): JobsManager {
    return useContext(jobsContext);
}
