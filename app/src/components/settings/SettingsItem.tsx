import React from "react";

import { IonCol, IonRow } from "@ionic/react";

interface SettingsItemProps {
    /** The ID of the settings item */
    id?: string;
    /** The label of the settings item */
    label: React.ReactNode;
    /** The input of the settings item */
    input: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = (props) => {
    return (
        <IonRow id={props.id}>
            <IonCol size="3" className="flex items-center">
                {props.label}
            </IonCol>
            <IonCol className="flex items-center">{props.input}</IonCol>
        </IonRow>
    );
};

export default SettingsItem;
