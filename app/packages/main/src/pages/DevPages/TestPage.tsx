import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import { Job } from "@components/explorer/jobs";
import JobsList from "@components/explorer/jobs/JobsList";
import { jobsContext } from "@components/explorer/jobs/context";

const TestPage: React.FC = () => {
    // Constants
    const jobs = new Map<string, Job>([
        ["job_fail1", { name: "fail1", direction: "upload", description: "Failed", progress: false }],
        ["job_succ1", { name: "succ1", direction: "upload", description: "Complete", progress: true }],
        ["job_prog1", { name: "prog1", direction: "upload", description: "Thinking", progress: 0.25 }],
        ["job_prog2", { name: "prog2", direction: "upload", description: "Processing", progress: 0.8 }],
        ["job_fail2", { name: "fail2", direction: "upload", description: "Failed", progress: false }],
        ["job_succ2", { name: "succ2", direction: "upload", description: "Complete", progress: true }],
        ["job_pend", { name: "pend", direction: "upload", description: "Loading", progress: null }],
    ]);

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>

                <hr />
                <jobsContext.Provider
                    value={{
                        jobs: jobs,
                        addJob: (_id: string, _job: Job) => {},
                        getJob: (_id: string) => {
                            return { id: _id, name: "", description: "", progress: 0, direction: "upload" };
                        },
                        updateJob: (_id: string, _newStatus: string, _newProgress?: number | null) => {},
                        updateProgress: (_id: string, _newProgress: number | null) => {},
                        cancelJob: () => {},
                        deleteJob: (_id: string) => {},
                        clearComplete: () => {},
                    }}
                >
                    <JobsList />
                </jobsContext.Provider>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
