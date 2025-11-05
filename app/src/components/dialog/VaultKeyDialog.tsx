import React, { useState } from "react";

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

import { toMnemonic } from "@lib/security/bip39";

import { useAuth } from "@components/auth/context";
import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";

import "./VaultKeyDialog.css";

interface VaultKeyDialogProps {
    /**
     * A vault key to display.
     *
     * If not provided, will use the vault key from the authentication context.
     */
    vaultKey?: Buffer;
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Whether the vault key input is disabled */
    inputDisabled?: boolean;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const VaultKeyDialog: React.FC<VaultKeyDialogProps> = (props) => {
    // Contexts
    const auth = useAuth();

    // States
    const [isValid, setIsValid] = useState<boolean>();

    // Get local vault key
    let localVaultKey = null;
    if (props.vaultKey) {
        localVaultKey = props.vaultKey!;
    }
    if (auth.vaultKey) {
        localVaultKey = auth.vaultKey;
    }

    // Render
    return (
        <IonModal
            className="min-h-172"
            id="vault-key-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonContent className="flex h-172 flex-col">
                <IonHeader className="h-14">
                    <IonToolbar className="pt-0">
                        <IonTitle>Vault Key</IonTitle>
                        <IonButtons slot="end">
                            <IonButton id="vault-key-modal-close" onClick={props.onDidDismiss}>
                                <IonIcon size="large" icon={close} slot="icon-only" />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                <div className="ion-padding-start ion-padding-end h-[calc(100%-var(--spacing)*14)] overflow-y-scroll">
                    <IonText className="text-justify" color="danger">
                        <p className="text-sm leading-none md:text-base">
                            <span className="font-bold">Warning</span>: this vault key is used to encrypt and decrypt
                            all data stored in the vault. It is critical to keep this key secret.
                        </p>
                    </IonText>
                    <details className="ion-margin-top" style={{ outline: "none" }}>
                        <summary className="ion-text-wrap" style={{ cursor: "pointer", userSelect: "none" }}>
                            Reveal vault key
                        </summary>
                        <p className="ion-padding-start ion-padding-end mt-1 mb-0 text-justify text-sm leading-none text-yellow-600 md:text-base">
                            Consider taking a screenshot and printing out a copy of the vault key, storing it in a
                            secure location.
                        </p>
                        <div className="flex flex-col items-center">
                            <BIP39MnemonicInput
                                numWords={24}
                                initialWords={localVaultKey ? toMnemonic(localVaultKey) : undefined}
                                maxSuggestions={5}
                                onEntropy={(entropy) => {
                                    auth.setVaultKey(entropy);
                                    console.debug(`Changed vault key to ${entropy.toString("hex")}`);
                                    setIsValid(true);
                                    setTimeout(() => {
                                        setIsValid(undefined);
                                    }, 2000);
                                }}
                                onError={(e) => {
                                    console.error(e);
                                    setIsValid(false);
                                    setTimeout(() => {
                                        setIsValid(undefined);
                                    }, 2000);
                                }}
                                disabled={props.inputDisabled}
                            />
                            <div className="mb-2 h-8 text-center">
                                {isValid === false && <IonText color="danger">Invalid vault key</IonText>}
                                {isValid === true && <IonText color="success">Vault key changed successfully!</IonText>}
                            </div>
                        </div>
                    </details>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default VaultKeyDialog;
