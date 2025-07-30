import { AlertOptions, ToastOptions } from "@ionic/core";

/**
 * Methods for UI feedback, specifically for file explorer components.
 */
export interface UIFeedbackMethods {
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
