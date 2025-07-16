import React from "react";

import { IonCol, IonGrid, IonItem, IonRow } from "@ionic/react";

interface SettingsItemProps {
    label: React.ReactNode;
    input: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = (props) => {
    return (
        <IonItem>
            <div className="flex w-full items-center">
                <IonGrid>
                    <IonRow>
                        <IonCol size="3" className="flex items-center">
                            {props.label}
                        </IonCol>
                        <IonCol className="flex items-center">{props.input}</IonCol>
                    </IonRow>
                </IonGrid>
            </div>
        </IonItem>
    );
};

export default SettingsItem;
