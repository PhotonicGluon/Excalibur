import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import { Job } from "@components/explorer/JobEntry";
import JobsList from "@components/explorer/JobsList";

const TestPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div className="h-full w-100">
                    <JobsList
                        jobs={(() => {
                            const jobs = new Map<string, Job>();
                            jobs.set("test", {
                                filename: "test.txt",
                                status: "Reading the file...",
                                progress: 0.123,
                            });
                            // jobs.set("test2", {
                            //     filename: "test2.txt",
                            //     status: "Encrypting...",
                            //     progress: 0.456,
                            // });
                            // jobs.set("test3", {
                            //     filename: "test3.txt",
                            //     status: "Uploading...",
                            //     progress: 0.789,
                            // });
                            // jobs.set("long", {
                            //     filename: "a-super-long-name-a-super-long-name-a-super-long-name-a-super-long-name.txt",
                            //     status: "Uploading...",
                            //     progress: 0.789,
                            // });

                            return jobs;
                        })()}
                    ></JobsList>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
