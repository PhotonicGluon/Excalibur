import React from "react";

import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonText,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import { close } from "ionicons/icons";

import "./VaultKeyDialog.css";

interface VaultKeyDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Decrypted vault key */
    vaultKey: Buffer;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const VaultKeyDialog: React.FC<VaultKeyDialogProps> = ({ isOpen, vaultKey, onDidDismiss }) => {
    // Preprocess vault key so that it is easier to read
    // TODO: Add auto-correction checksum to the vault key when displaying
    const vaultKeyRaw = vaultKey.toString("hex");
    const chunks = vaultKeyRaw.match(/.{1,4}/g);
    const vaultKeyStr = chunks!.join(" ").toUpperCase();

    // Render
    return (
        <IonModal
            className="flex min-h-172 flex-col"
            id="vault-key-modal"
            isOpen={isOpen}
            onDidDismiss={onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonContent className="flex h-172 flex-col">
                <IonHeader className="ion-no-border">
                    <IonToolbar>
                        <IonTitle>Vault Key</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={onDidDismiss}>
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                <div className="ion-padding-start ion-padding-end">
                    <IonText className="text-justify" color="danger">
                        <p>
                            <span className="font-bold">Warning</span>: this vault key is used to encrypt and decrypt
                            all data stored in the vault. It is critical to keep this key secret.
                        </p>
                    </IonText>
                    <details className="ion-margin-top" style={{ outline: "none" }}>
                        <summary className="ion-text-wrap" style={{ cursor: "pointer", userSelect: "none" }}>
                            Reveal vault key
                        </summary>
                        <div className="flex w-full items-center justify-center">
                            <div className="mt-2 w-72 rounded-2xl bg-slate-200 p-4 dark:bg-slate-900">
                                <p className="m-0 text-center font-mono text-2xl">{vaultKeyStr}</p>
                            </div>
                        </div>
                    </details>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default VaultKeyDialog;
