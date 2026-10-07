import React, { useState } from "react";

import { IonContent, IonPage } from "@ionic/react";

import { sleep } from "@lib/util";

import MerkleMigrationBanner from "@components/merkle/MerkleMigrationBanner";
import { merkleContext } from "@components/merkle/context";

const MAX = 10;
const SLEEP_DELAY = 500;

const TestPage: React.FC = () => {
    // States
    const [status, setStatus] = useState<"none" | "migrating" | "active">("none");

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>

                <hr />

                <merkleContext.Provider
                    value={{
                        status,
                        busy: false,
                        lastSyncedAt: null,
                        refreshStatus: async () => {
                            console.log("refreshStatus()");
                        },
                        triggerSync: async () => {
                            console.log("triggerSync()");
                            return { success: true };
                        },
                        migrate: async (onProgress?: (migratedCount: number, totalCount: number) => void) => {
                            console.log("migrate() called");
                            setStatus("migrating");
                            if (onProgress) {
                                for (let i = 1; i <= MAX; i++) {
                                    console.log(`migrate() onProgress(${i}, ${MAX})`);
                                    onProgress(i, MAX);
                                    await sleep(SLEEP_DELAY);
                                }
                            }
                            setStatus("active");
                            return { success: true };
                        },
                    }}
                >
                    <MerkleMigrationBanner />
                </merkleContext.Provider>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
