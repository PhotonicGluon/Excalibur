import React, { useState } from "react";

import PasswordInput from "@components/inputs/PasswordInput";
import { IonButton, IonButtons, IonFooter, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from "@ionic/react";
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
            className="[--height:fit-content] [--width:min(24rem,90vw)]"
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

            <PasswordInput className="ion-padding" onPasswordChange={setPassword} />

            <IonFooter>
                <IonButton
                    className="mx-auto -mt-2 w-full px-4 pb-4"
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
