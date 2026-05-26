import React from "react";

import { ProvideJobs, useJobsManager } from "@components/explorer/jobs/context";
import JobsList from "@components/explorer/jobs/JobsList";
import { IonContent, IonPage } from "@ionic/react";
import { useMount } from "@lib/hooks";

const JobsDisplay = () => {
    const jobsManager = useJobsManager();

    useMount(() => {
        jobsManager.addJob("test", {
            name: "test.txt",
            description: "Reading the file...",
            progress: 0.123,
            direction: "download",
            controller: new AbortController(),
        });
        jobsManager.addJob("test2", {
            name: "test2.txt",
            description: "Encrypting...",
            progress: 0.456,
            direction: "upload",
            controller: new AbortController(),
        });
        jobsManager.addJob("test3", {
            name: "test3.txt",
            description: "Uploading...",
            progress: 0.789,
            direction: "upload",
            controller: new AbortController(),
        });
        jobsManager.addJob("long", {
            name: "a-super-long-name-a-super-long-name-a-super-long-name-a-super-long-name.txt",
            description: "Uploading...",
            progress: 0.789,
            direction: "upload",
            controller: new AbortController(),
        });
    });

    return <JobsList />;
};

const JobsPage: React.FC = () => {
    // Render
    return (
        <IonPage>
            <IonContent>
                <h1>Jobs Test Page</h1>
                <div className="h-full w-full max-w-180">
                    <ProvideJobs>
                        <JobsDisplay />
                    </ProvideJobs>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default JobsPage;
