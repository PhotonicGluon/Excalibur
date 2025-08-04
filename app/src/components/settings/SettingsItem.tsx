import React from "react";

import { IonCol, IonGrid, IonItem, IonRow } from "@ionic/react";

interface SettingsItemProps {
    label: React.ReactNode;
    input: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = (props) => {
    return (
        <IonRow>
            <IonCol size="3" className="flex items-center">
                {props.label}
            </IonCol>
            <IonCol className="flex items-center">{props.input}</IonCol>
        </IonRow>
    );
};

export default SettingsItem;
