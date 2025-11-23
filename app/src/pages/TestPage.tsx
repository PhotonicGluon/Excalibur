import React from "react";
import { Redirect } from "react-router";

import { IonContent, IonPage } from "@ionic/react";

import { Job } from "@components/explorer/JobEntry";
import JobsList from "@components/explorer/JobsList";

const TestPage: React.FC = () => {
    if (process.env.NODE_ENV !== "development") {
        return <Redirect from={location.pathname} to="/" />;
    }

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div className="h-full w-100">
                    <JobsList
                        jobs={(() => {
                            const jobs = new Map<string, Job>();
                            jobs.set("test", {
                                filename: "test.txt",
                                description: "Reading the file...",
                                progress: 0.123,
                                direction: "download",
                            });
                            jobs.set("test2", {
                                filename: "test2.txt",
                                description: "Encrypting...",
                                progress: 0.456,
                                direction: "upload",
                            });
                            jobs.set("test3", {
                                filename: "test3.txt",
                                description: "Uploading...",
                                progress: 0.789,
                                direction: "upload",
                            });
                            jobs.set("long", {
                                filename: "a-super-long-name-a-super-long-name-a-super-long-name-a-super-long-name.txt",
                                description: "Uploading...",
                                progress: 0.789,
                                direction: "upload",
                            });

                            return jobs;
                        })()}
                        onCancelJob={(jobId) => console.log("Cancelling job", jobId)}
                    ></JobsList>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
