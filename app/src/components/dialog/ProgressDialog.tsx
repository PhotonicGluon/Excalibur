import React from "react";

import { IonContent, IonModal, IonProgressBar } from "@ionic/react";

import "./ProgressDialog.css";

interface ProgressDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Top message of the dialog */
    message: string;
    /** Progress value between 0 and 1, or null if indeterminate */
    progress: number | null;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({ isOpen, message, progress, onDidDismiss }) => {
    return (
        <IonModal
            className="flex flex-col"
            id="example-modal"
            isOpen={isOpen}
            onDidDismiss={onDidDismiss}
            backdropDismiss={false}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonContent className="flex flex-col justify-items-center">
                <div className="ion-padding flex h-full items-center justify-center">
                    <div className="w-full">
                        <p className="text-center text-xl">{message}</p>
                        <IonProgressBar
                            value={progress === null ? undefined : progress}
                            type={progress === null ? "indeterminate" : "determinate"}
                        ></IonProgressBar>
                        {progress === null ? (
                            <p className="text-center">Please wait...</p>
                        ) : (
                            <p className="text-center">{Math.round(progress * 100)}%</p>
                        )}
                    </div>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default ProgressDialog;
