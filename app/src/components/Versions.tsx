import React, { HTMLAttributes } from "react";

import { IonText } from "@ionic/react";
import packageInfo from "@root/package.json";

import { useAuth } from "@components/auth/context";

const Versions: React.FC<HTMLAttributes<HTMLDivElement>> = (props) => {
    const auth = useAuth();

    return (
        <div {...props}>
            <IonText color="medium" className="text-xs md:text-sm">
                App version: <span className="font-mono">{packageInfo.version}</span>
            </IonText>
            <IonText color="medium" className="text-xs md:text-sm">
                Server version: <span className="font-mono">{auth.serverInfo!.version}</span>
            </IonText>
        </div>
    );
};

export default Versions;
