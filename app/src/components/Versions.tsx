import React, { HTMLAttributes } from "react";

import { IonText } from "@ionic/react";
import packageInfo from "@root/package.json";

const Versions: React.FC<HTMLAttributes<HTMLDivElement>> = ({ ...props }) => {
    return (
        <div className={props.className}>
            <IonText color="medium" className="text-xs md:text-sm">
                App version: <span className="font-mono">{packageInfo.version}</span>
            </IonText>
            {/* TODO: Get server version */}
            {/* <IonText color="medium" className="text-xs md:text-sm">
                Server version: <span className="font-mono">{auth.serverInfo!.version}</span>
            </IonText> */}
        </div>
    );
};

export default Versions;
