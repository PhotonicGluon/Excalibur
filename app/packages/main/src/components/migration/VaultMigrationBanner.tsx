import { useState } from "react";

import { IonButton, IonCard, IonCardContent, IonIcon, IonProgressBar, IonText } from "@ionic/react";
import { alertCircleOutline, shieldCheckmarkOutline } from "ionicons/icons";

import { MigrationStep, useVaultMigration } from "@lib/hooks/vault-migration";

const STEP_LABELS: Record<MigrationStep, string> = {
    names: "Encrypting names",
    merkle: "Building integrity tree",
};

const VaultMigrationBanner: React.FC = () => {
    // Hooks
    const { needsNames, needsMerkle, interrupted, running, progress, error, run } = useVaultMigration();

    // States
    const [isDismissed, setIsDismissed] = useState(false);

    // Render
    if (!running && !needsNames && !needsMerkle) {
        // Nothing left to upgrade (or it cannot be determined), so hide it
        return null;
    }
    if (isDismissed && !running) {
        // User dismissed banner, so hide it
        return null;
    }

    let cardColour: string | undefined = undefined;
    let iconColour = "dark";
    let buttonColour = "primary";
    let beginButtonText = "Start Now";
    if (error) {
        cardColour = "danger";
        buttonColour = "dark";
        beginButtonText = "Retry";
    } else if (interrupted && !running) {
        cardColour = "warning";
        iconColour = "light";
        buttonColour = "light";
        beginButtonText = "Resume";
    }

    const whatWillUpgradeDo: string[] = [];
    if (needsNames) whatWillUpgradeDo.push("encrypt the names of your items");
    if (needsMerkle) whatWillUpgradeDo.push("support data integrity verification");

    return (
        <IonCard id="vault-migration-banner" className="ion-margin" color={cardColour}>
            <IonCardContent className="flex items-center gap-3">
                <IonIcon
                    className="size-8"
                    color={iconColour}
                    icon={error && !running ? alertCircleOutline : shieldCheckmarkOutline}
                />
                <div className="flex-1">
                    {running && progress ? (
                        <>
                            <IonText color="dark">
                                <p className="m-0">
                                    {progress.stepCount > 1 && `Step ${progress.stepNumber} of ${progress.stepCount}: `}
                                    {progress.phase ?? STEP_LABELS[progress.step]}
                                </p>
                            </IonText>
                            <IonProgressBar
                                type={progress.total ? "determinate" : "indeterminate"}
                                value={progress.total ? progress.migrated! / progress.total : undefined}
                            />
                        </>
                    ) : running ? (
                        <IonProgressBar type="indeterminate" />
                    ) : interrupted && !error ? (
                        <IonText color="light">
                            <p className="m-0">Vault upgrade seems to have been interrupted.</p>
                        </IonText>
                    ) : (
                        <IonText color="dark">
                            <p className="m-0">
                                {error ?? `Your vault can be upgraded to ${whatWillUpgradeDo.join(" and ")}.`}
                            </p>
                        </IonText>
                    )}
                </div>
                {!running && (
                    <>
                        <IonButton size="small" color={buttonColour} fill="clear" onClick={() => setIsDismissed(true)}>
                            Later
                        </IonButton>
                        <IonButton size="small" color={buttonColour} onClick={run}>
                            {beginButtonText}
                        </IonButton>
                    </>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default VaultMigrationBanner;
