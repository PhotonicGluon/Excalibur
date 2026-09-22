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
    const [progress, setProgress] = useState<{ migrated: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Functions
    /**
     * Starts the Merkle tree migration process.
     */
    async function handleStart() {
        setError(null);
        setProgress({ migrated: 0, total: 0 });

        const result = await merkle.migrate((migratedCount, totalCount) => {
            setProgress({ migrated: migratedCount, total: totalCount });
        });
        if (!result.success) {
            setError(result.error ?? "Migration failed");
        }
    }

    // Render
    if (merkle.status === null || merkle.status === "active") {
        // Merkle tree already active (or cannot be determined), so hide it
        return null;
    }
    if (isDismissed && merkle.status === "none") {
        // User dismissed banner and tree is not migrated, so hide it
        return null;
    }

    return (
        <IonCard className="ion-margin" color={error ? "danger" : undefined}>
            <IonCardContent className="flex items-center gap-3">
                <IonIcon className="size-8" color="dark" icon={error ? alertCircleOutline : shieldCheckmarkOutline} />

                <div className="flex-1">
                    {isMigrating ? (
                        <>
                            <IonText color="dark">
                                <p className="m-0">
                                    Securing your vault
                                    {progress && progress.total > 0
                                        ? ` (${progress.migrated}/${progress.total})`
                                        : "..."}
                                </p>
                            </IonText>
                            <IonProgressBar
                                type={progress && progress.total > 0 ? "determinate" : "indeterminate"}
                                value={progress && progress.total > 0 ? progress.migrated / progress.total : undefined}
                            />
                        </>
                    ) : (
                        <IonText color="dark">
                            <p className="m-0">
                                {error ?? "Your vault can be upgraded to support data integrity verification."}
                            </p>
                        </IonText>
                    )}
                </div>
                {!isMigrating && (
                    <>
                        <IonButton size="small" fill="clear" onClick={() => setIsDismissed(true)}>
                            Later
                        </IonButton>
                        <IonButton size="small" onClick={handleStart}>
                            {error ? "Retry" : "Start Now"}
                        </IonButton>
                    </>
                )}
            </IonCardContent>
        </IonCard>
    );
};

export default MerkleMigrationBanner;
