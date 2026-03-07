import React, { useCallback } from "react";

import { Color } from "@ionic/core";
import { IonButton, IonContent, IonPage, useIonToast } from "@ionic/react";

const TestPage: React.FC = () => {
    const [presentToast, dismissToast] = useIonToast();
    const [clickCount, setClickCount] = React.useState(0);

    // Helper functions
    /**
     * Displays a toast with the given message and colour.
     *
     * @param message The message to display
     * @param colour The colour of the toast
     */
    const presentSnackbar = useCallback(
        async (message: string, colour: Color = "primary") => {
            await dismissToast().catch(() => {}); // Safely handle cases where no toast is active
            presentToast({
                message: message,
                duration: 2000,
                position: "bottom",
                positionAnchor: "fab-button",
                color: colour,
                cssClass: "[--max-width:min(var(--spacing)*128,calc(100%-var(--spacing)*32))]",
            });
        },
        [presentToast, dismissToast],
    );

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <IonButton
                    onClick={() => {
                        setClickCount((prev) => prev + 1);
                        presentSnackbar(`Test message ${clickCount}`, "success");
                    }}
                >
                    Test Snackbar
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
