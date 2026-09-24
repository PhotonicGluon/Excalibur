import { useState } from "react";

import { IonButton, IonCard, IonCardContent, IonIcon, IonProgressBar, IonText } from "@ionic/react";
import { alertCircleOutline, shieldCheckmarkOutline } from "ionicons/icons";

import { useMerkle } from "@components/merkle/context";

const MerkleMigrationBanner: React.FC = () => {
    // Contexts
    const merkle = useMerkle();
    const isMigrating = merkle.status === "migrating" || merkle.busy;

    // States
    const [isDismissed, setIsDismissed] = useState(false);
    const [migrationPhase, setMigrationPhase] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ migrated: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isMigrationUnderway = progress && progress.total > 0;

    // Functions
    /**
     * Starts the Merkle tree migration process.
     */
    async function handleStart() {
        setProgress({ migrated: 0, total: 0 });
        setError(null);

        const result = await merkle.migrate(
            (phase) => {
                setMigrationPhase(phase);
            },
            (migratedCount, totalCount) => {
                setProgress({ migrated: migratedCount, total: totalCount });
            },
        );
        if (!result.success) {
            setError(result.error ?? "Migration failed");
        }
    }

    // Render
    if (merkle.status === null || merkle.status === "active") {
        // Merkle tree already active (or cannot be determined), so hide it
        return null;
    }
    if (isDismissed) {
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
    } else if (isMigrating && !isMigrationUnderway) {
        cardColour = "warning";
        iconColour = "light";
        buttonColour = "light";
        beginButtonText = "Resume";
    }

    return (
        <IonCard className="ion-margin" color={cardColour}>
            <IonCardContent className="flex items-center gap-3">
                <IonIcon
                    className="size-8"
                    color={iconColour}
                    icon={error || !isMigrationUnderway ? alertCircleOutline : shieldCheckmarkOutline}
                />
                <div className="flex-1">
                    {isMigrating && isMigrationUnderway && (
                        <>
                            <IonText color="dark">
                                <p className="m-0">{migrationPhase}</p>
                            </IonText>
                            <IonProgressBar type="determinate" value={progress.migrated / progress.total} />
                        </>
                    )}
                    {isMigrating && !isMigrationUnderway && (
                        <>
                            <IonText color="light">
                                <p className="m-0">Vault upgrade seems to have been interrupted.</p>
                            </IonText>
                        </>
                    )}
                    {!isMigrating && (
                        <IonText color="dark">
                            <p className="m-0">
                                {error ?? "Your vault can be upgraded to support data integrity verification."}
                            </p>
                        </IonText>
                    )}
                </div>
                {(!isMigrating || !isMigrationUnderway) && (
                    <>
                        <IonButton size="small" color={buttonColour} fill="clear" onClick={() => setIsDismissed(true)}>
                            Later
                        </IonButton>
                        <IonButton size="small" color={buttonColour} onClick={handleStart}>
                            {beginButtonText}
                        </IonButton>
                    </>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default MerkleMigrationBanner;
