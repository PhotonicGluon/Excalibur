import { MaskitoOptions, maskitoTransform } from "@maskito/core";
import { useMaskito } from "@maskito/react";
import React, { Dispatch, SetStateAction, useState } from "react";

import { IonTextareaCustomEvent, TextareaInputEventDetail } from "@ionic/core";
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonText,
    IonTextarea,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import { close } from "ionicons/icons";

import "./VaultKeyDialog.css";

function generateVaultKeyMask() {
    let mask = [];
    for (let i = 0; i < 15; i++) {
        mask.push(...Array(4).fill(/[0-9A-Fa-f]/), " ");
    }
    mask.push(...Array(4).fill(/[0-9A-Fa-f]/));
    return mask;
}

interface VaultKeyDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Decrypted vault key */
    vaultKey: Buffer;
    /** Function to set the vault key */
    setVaultKey: Dispatch<SetStateAction<Buffer<ArrayBufferLike> | null>>;
    /** Callback when the dialog is dismissed */
    onDidDismiss?: () => void;
}

const VaultKeyDialog: React.FC<VaultKeyDialogProps> = (props) => {
    // Preprocess vault key so that it is easier to read
    const vaultKeyRaw = props.vaultKey.toString("hex").toLocaleUpperCase();

    // States
    const vaultKeyMaskOptions: MaskitoOptions = {
        mask: generateVaultKeyMask(),
    };
    const vaultKeyMask = useMaskito({ options: vaultKeyMaskOptions });

    const [isTouched, setIsTouched] = useState(false);
    const [isValid, setIsValid] = useState<boolean>();
    const [localVaultKey, setLocalVaultKey] = useState(maskitoTransform(vaultKeyRaw, vaultKeyMaskOptions));

    // Functions
    /**
     * Handles the change event of the vault key input.
     *
     * @param event The change event
     */
    function onChangeVaultKeyInput(event: IonTextareaCustomEvent<TextareaInputEventDetail>) {
        const currVal = (event.detail.value || "").toLocaleUpperCase();
        setLocalVaultKey(currVal);
        setIsValid(undefined);

        const possibleNewKey = currVal.replaceAll(" ", "").toLocaleLowerCase();
        if (possibleNewKey.length === 64) {
            const newVaultKey = Buffer.from(possibleNewKey, "hex");
            props.setVaultKey(newVaultKey);
            console.debug(`Changed vault key to ${newVaultKey.toString("hex")}`);
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }

    const markTouched = () => {
        setIsTouched(true);
    };

    // Render
    return (
        <IonModal
            className="flex min-h-172 flex-col"
            id="vault-key-modal"
            isOpen={props.isOpen}
            onDidDismiss={props.onDidDismiss}
            backdropDismiss={true}
            handle={false} // Hide drag handle for cleaner look
        >
            <IonContent className="flex h-172 flex-col">
                <IonHeader className="ion-no-border">
                    <IonToolbar>
                        <IonTitle>Vault Key</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={props.onDidDismiss}>
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
                            <IonTextarea
                                className={`${isValid && "ion-valid"} ${isValid === false && "ion-invalid"} ${isTouched && "ion-touched"} m-0 px-4 !font-mono !text-2xl`}
                                placeholder="Vault Key"
                                rows={4}
                                ref={(vaultKeyRef) => {
                                    if (vaultKeyRef) {
                                        vaultKeyRef.getInputElement().then((input) => vaultKeyMask(input));
                                    }
                                }}
                                errorText="Invalid vault key"
                                onIonInput={(e) => onChangeVaultKeyInput(e)}
                                onIonBlur={() => markTouched()}
                                value={localVaultKey}
                            ></IonTextarea>
                        </div>
                        <IonText color="warning">
                            <p className="ion-padding-start ion-padding-end text-justify">
                                Consider taking a screenshot and printing out a copy of the vault key, storing it in a
                                secure location.
                            </p>
                        </IonText>
                    </details>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default VaultKeyDialog;
