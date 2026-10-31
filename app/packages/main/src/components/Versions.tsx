import { isPlatform } from "@ionic/core";
import { IonText } from "@ionic/react";
import packageInfo from "@root/package.json";
import React, { HTMLAttributes } from "react";

import { useAuth } from "@components/auth/context";

const Versions: React.FC<HTMLAttributes<HTMLDivElement>> = (props) => {
    // Contexts
    const auth = useAuth();

    // Render
    let electronVersion: string | null = null;
    if (isPlatform("electron")) {
        const userAgent = navigator.userAgent;
        const electronMatch = userAgent.match(/Electron\/(\d+\.\d+\.\d+)/);
        electronVersion = electronMatch ? electronMatch[1] : "Unknown";
    }

    return (
        <div {...props}>
            <IonText color="medium" className="block">
                App version: <span className="font-mono">{packageInfo.version}</span>
            </IonText>
            {electronVersion && (
                <>
                    <IonText color="medium" className="block">
                        Electron version: <span className="font-mono">{electronVersion}</span>
                    </IonText>
                    <div className="h-2" />
                </>
            )}

            <IonText color="medium" className="block">
                Server version: <span className="font-mono">{auth.serverInfo!.version}</span>
            </IonText>
        </div>
    );
};

export default Versions;
