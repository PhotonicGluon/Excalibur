import { useState } from "react";

import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonPage,
    IonRow,
    IonTextarea,
    IonTitle,
} from "@ionic/react";

import ExEF from "@lib/exef";
import { b64decodeURLSafe, b64encodeURLSafe } from "@lib/util";

const ExEFPage: React.FC = () => {
    // States
    const [symmetricKey, setSymmetricKey] = useState("one demo 16B key");
    const [encryptionNonce, setEncryptionNonce] = useState("0123456789ab");
    const [plaintext, setPlaintext] = useState("");
    const [encryptedPayload, setEncryptedPayload] = useState("");
    const [encryptedBase64, setEncryptedBase64] = useState("");
    const [encryptedHex, setEncryptedHex] = useState("");
    const [decryptionPayload, setDecryptionPayload] = useState("");
    const [decryptedPayload, setDecryptedPayload] = useState("");

    // Functions
    function handleEncrypt() {
        const exef = new ExEF(Buffer.from(symmetricKey, "utf-8"), Buffer.from(encryptionNonce, "utf-8"), "encrypt");
        const encrypted = exef.encrypt(Buffer.from(plaintext, "utf-8"));
        setEncryptedPayload(encrypted.toString("utf-8"));
        setEncryptedBase64(b64encodeURLSafe(encrypted));
        setEncryptedHex(encrypted.toString("hex"));
    }

    function handleDecrypt() {
        try {
            const decrypted = ExEF.decrypt(Buffer.from(symmetricKey, "utf-8"), b64decodeURLSafe(decryptionPayload));
            setDecryptedPayload(decrypted.toString("utf-8"));
        } catch (error: unknown) {
            console.error("Decryption failed:", error);
            setDecryptedPayload("Decryption failed: " + (error as Error).message);
        }
    }

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <IonHeader>
                    <IonTitle className="text-center text-3xl font-bold">ExEF Test Page</IonTitle>
                </IonHeader>

                {/* Main symmetric key input */}
                <IonCard>
                    <IonCardHeader>
                        <IonCardTitle>Symmetric Key</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                        <IonItem>
                            <IonLabel position="stacked">Key</IonLabel>
                            <IonInput
                                className="font-mono"
                                value={symmetricKey}
                                onIonInput={(e) => setSymmetricKey(e.detail.value || "")}
                                placeholder="Enter ASCII string"
                            />
                        </IonItem>
                    </IonCardContent>
                </IonCard>

                {/* Encryption Section */}
                <IonCard>
                    <IonCardHeader>
                        <IonCardTitle>Encryption</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                        <IonGrid>
                            <IonRow>
                                {/* Left half - inputs */}
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">12-byte Nonce (ASCII)</IonLabel>
                                        <IonInput
                                            className="font-mono"
                                            value={encryptionNonce}
                                            onIonInput={(e) => setEncryptionNonce(e.detail.value || "")}
                                            placeholder="Enter nonce"
                                        />
                                    </IonItem>

                                    <IonItem style={{ marginTop: "16px" }}>
                                        <IonLabel position="stacked">Plaintext</IonLabel>
                                        <IonTextarea
                                            className="font-mono"
                                            value={plaintext}
                                            onIonInput={(e) => setPlaintext(e.detail.value || "")}
                                            placeholder="Enter text to encrypt"
                                            rows={4}
                                        />
                                    </IonItem>
                                </IonCol>

                                {/* Right half - outputs */}
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">Encrypted Payload (UTF-8)</IonLabel>
                                        <IonTextarea
                                            value={encryptedPayload}
                                            readonly={true}
                                            placeholder="Encrypted result will appear here"
                                            rows={4}
                                        />
                                    </IonItem>

                                    <IonItem className="mt-4">
                                        <IonLabel position="stacked">Encrypted Payload (URL-Safe Base64)</IonLabel>
                                        <IonTextarea
                                            className="font-mono"
                                            value={encryptedBase64}
                                            readonly={true}
                                            placeholder="URL-safe base64 representation will appear here"
                                            rows={4}
                                        />
                                    </IonItem>

                                    <IonItem className="mt-4">
                                        <IonLabel position="stacked">Encrypted Payload (Hex)</IonLabel>
                                        <IonTextarea
                                            className="font-mono"
                                            value={encryptedHex}
                                            readonly={true}
                                            placeholder="Hex representation will appear here"
                                            rows={4}
                                        />
                                    </IonItem>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                        <div style={{ marginTop: "16px", textAlign: "center" }}>
                            <IonButton expand="block" onClick={handleEncrypt}>
                                Encrypt
                            </IonButton>
                        </div>
                    </IonCardContent>
                </IonCard>

                {/* Decryption Section */}
                <IonCard>
                    <IonCardHeader>
                        <IonCardTitle>Decryption</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                        <IonGrid>
                            <IonRow>
                                {/* Left half - input */}
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">URL-Safe Base64 Encrypted Payload</IonLabel>
                                        <IonTextarea
                                            className="font-mono"
                                            value={decryptionPayload}
                                            onIonInput={(e) => setDecryptionPayload(e.detail.value || "")}
                                            placeholder="Enter URL-safe base64 encrypted payload to decrypt"
                                            rows={6}
                                        />
                                    </IonItem>
                                </IonCol>

                                {/* Right half - output */}
                                <IonCol size="6">
                                    <IonItem>
                                        <IonLabel position="stacked">Decrypted Payload</IonLabel>
                                        <IonTextarea
                                            className="font-mono"
                                            value={decryptedPayload}
                                            readonly={true}
                                            placeholder="Decrypted result will appear here"
                                            rows={6}
                                        />
                                    </IonItem>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                        <div style={{ marginTop: "16px", textAlign: "center" }}>
                            <IonButton expand="block" onClick={handleDecrypt}>
                                Decrypt
                            </IonButton>
                        </div>
                    </IonCardContent>
                </IonCard>
            </IonContent>
        </IonPage>
    );
};

export default ExEFPage;
