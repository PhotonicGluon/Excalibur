import React, { useEffect, useState } from "react";

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

import { useAuth } from "@components/auth/context";
import GridInput from "@components/inputs/GridInput";

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
    const [localVaultKey, setLocalVaultKey] = useState<string>("");

    // Functions
    /**
     * Handles the change event of the vault key input.
     *
     * @param event The change event
     */
    function onChangeVaultKeyInput(currVal: string) {
        setLocalVaultKey(currVal);
        setIsValid(undefined);

        const possibleNewKey = currVal.replaceAll(" ", "").toLocaleLowerCase();
        if (possibleNewKey.length === 64) {
            const newVaultKey = Buffer.from(possibleNewKey, "hex");
            auth.setVaultKey(newVaultKey);
            console.debug(`Changed vault key to ${newVaultKey.toString("hex")}`);
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }

    // Effects
    useEffect(() => {
        let vk;
        if (props.vaultKey) {
            vk = props.vaultKey!;
        }
        if (auth.vaultKey) {
            vk = auth.vaultKey;
        }
        const vaultKeyRaw = vk ? vk.toString("hex").toLocaleUpperCase() : "";
        setLocalVaultKey(vaultKeyRaw);
    }, [auth.vaultKey, props.vaultKey]);

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
                <IonHeader>
                    <IonToolbar className="!pt-0">
                        <IonTitle>Vault Key</IonTitle>
                        <IonButtons slot="end">
                            <IonButton id="vault-key-modal-close" onClick={props.onDidDismiss}>
                                <IonIcon size="large" icon={close} slot="icon-only" />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                <div className="ion-padding-start ion-padding-end">
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
                        <div className="flex flex-col items-center">
                            <GridInput
                                value={localVaultKey}
                                onChange={onChangeVaultKeyInput}
                                disabled={props.inputDisabled}
                            ></GridInput>
                            {isValid === false && (
                                <IonText color="danger" className="-mt-1 mb-2 text-center">
                                    Invalid vault key
                                </IonText>
                            )}
                        </div>
                        <p className="ion-padding-start ion-padding-end mt-1 mb-0 text-justify text-sm leading-none text-yellow-600 md:text-base">
                            Consider taking a screenshot and printing out a copy of the vault key, storing it in a
                            secure location.
                        </p>
                    </details>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default VaultKeyDialog;
