import { createContext, useContext } from "react";

import { AlertOptions, ToastOptions } from "@ionic/core";

import { Job } from "./JobEntry";

/**
 * Manages jobs and their states.
 */
export interface JobsManager {
    addJob(id: string, job: Job): void;
    getJob(id: string): Job;
    updateJob(id: string, newStatus: string, newProgress?: number | null): void;
    updateProgress(id: string, newProgress: number | null): void;
    deleteJob(id: string): void;
}

/**
 * Methods for UI feedback, specifically for file explorer components.
 */
export interface UIFeedbackMethods {
    /** Function to call when renaming is requested */
    onRename: (path: string, isDir: boolean) => Promise<void>;
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
    /** Function to call when the dialog is closed */
    setShowDialog: (showing: boolean) => void;
    /** Set the message to be displayed in the dialog */
    setDialogMessage: (title: string) => void;
    /** Set the progress of the dialog */
    setProgress: (progress: number | null) => void;
    /** Present an alert */
    presentAlert: (options: AlertOptions) => void;
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
