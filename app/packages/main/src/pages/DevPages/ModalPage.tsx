import React from "react";

import { IonButton, IonContent, IonItem, IonLabel, IonList, IonPage, IonTitle } from "@ionic/react";

import Modal from "@components/Modal";

const ModalPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Modal Page</h1>
                <IonButton id="open-modal" expand="block">
                    Open Modal
                </IonButton>

                <Modal trigger="open-modal" header={<IonTitle>Demo Modal</IonTitle>}>
                    <IonList>
                        <IonItem>
                            <IonLabel>
                                <h2>Connor Smith</h2>
                                <p>Sales Rep</p>
                            </IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>
                                <h2>Daniel Smith</h2>
                                <p>Product Designer</p>
                            </IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>
                                <h2>Greg Smith</h2>
                                <p>Director of Operations</p>
                            </IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>
                                <h2>Zoey Smith</h2>
                                <p>CEO</p>
                            </IonLabel>
                        </IonItem>
                    </IonList>
                </Modal>
            </IonContent>
        </IonPage>
    );
};

export default ModalPage;
