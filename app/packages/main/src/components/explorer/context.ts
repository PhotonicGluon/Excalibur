import { createContext, useContext } from "react";

import { AlertOptions, ToastOptions } from "@ionic/core";

import { Job } from "./JobEntry";

/**
 * Manages jobs and their states.
 */
export interface JobsManager {
    addJob(id: string, job: Job): void;
    getJob(id: string): Job;
    updateJob(id: string, newStatus: string, newProgress?: number | null, newWorker?: Worker): void;
    updateProgress(id: string, newProgress: number | null): void;
    cancelJob(id: string): void;
    deleteJob(id: string): void;
}

/**
 * Methods for UI feedback, specifically for file explorer components.
 */
export interface UIFeedbackMethods {
    jobsManager: JobsManager;
    /** Function to call when renaming is requested */
    onRename: (path: string, isDir: boolean) => Promise<void>;
    /** Function to call when moving is requested */
    onMove: (path: string) => Promise<void>;
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
    /** Present an alert */
    presentAlert: (options: AlertOptions) => void;
    /** Dismiss a presented alert */
    dismissAlert: () => void;
    /** Present a toast */
    presentToast: (options: ToastOptions) => void;
}

export const uiFeedbackContext = createContext<UIFeedbackMethods>(null!);

/**
 * Hook to get the UI feedback methods.
 *
 * @returns The UI feedback methods.
 */
export function useUIFeedback(): UIFeedbackMethods {
    return useContext(uiFeedbackContext);
}
