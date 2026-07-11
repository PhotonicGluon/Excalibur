import React, { useState } from "react";

import PasswordInput from "@components/inputs/PasswordInput";
import {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import { close } from "ionicons/icons";

interface PasswordDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when the password is confirmed */
    onDidConfirm?: (password: string) => void;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const PasswordDialog: React.FC<PasswordDialogProps> = (props) => {
    // States
    const [password, setPassword] = useState<string>("");

    // Render
    return (
        <IonModal
            className="min-h-80 [--height:35%] [--width:min(24rem,90vw)]"
            id="vault-key-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonHeader className="h-14">
                <IonToolbar className="pt-0">
                    <IonTitle>Enter Your Password</IonTitle>
                    <IonButtons slot="end">
                        <IonButton id="vault-key-modal-close" onClick={props.onDidDismiss}>
                            <IonIcon size="large" icon={close} slot="icon-only" />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <PasswordInput onPasswordChange={setPassword} />
            </IonContent>

            <IonFooter>
                <IonButton
                    className="mx-auto w-full p-4"
                    onClick={() => props.onDidConfirm?.(password)}
                    color="primary"
                    fill="solid"
                >
                    Confirm
                </IonButton>
            </IonFooter>
        </IonModal>
    );
};

export default PasswordDialog;
