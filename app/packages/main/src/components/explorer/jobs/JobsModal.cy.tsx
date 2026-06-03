import { mount } from "cypress/react";

import { IonApp } from "@ionic/react";

import { Job } from "./JobEntry";
import JobsModal from "./JobsModal";
import { jobsContext } from "./context";

describe("<JobsModal />", () => {
    function mountComponent(
        props: { jobs: Map<string, Job> },
        isShown: boolean,
        setIsShown: React.Dispatch<React.SetStateAction<boolean>>,
    ) {
        mount(
            <IonApp>
                <jobsContext.Provider
                    value={{
                        jobs: props.jobs,
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
                    <JobsModal isShown={isShown} setIsShown={setIsShown} />
                    <style>
                        {`
                        ion-modal ion-content {
                            min-height: 50vh;
                        }
                    `}
                    </style>
                </jobsContext.Provider>
            </IonApp>,
        );
    }

    it("renders no jobs correctly", () => {
        const jobs = new Map<string, Job>();
        mountComponent({ jobs }, true, () => {});

        cy.get("ion-modal ion-title").contains("No Jobs").should("be.visible");
        cy.get("ion-button[aria-label='Expand modal']").click();
        cy.get("ion-modal ion-content").contains("No active jobs").should("be.visible");
    });

    describe("renders jobs correctly", () => {
        for (let completed = 0; completed <= 2; completed++) {
            for (let failed = 0; failed <= 2; failed++) {
                for (let pending = 0; pending <= 2; pending++) {
                    const numJobs = completed + failed + pending;
                    if (numJobs === 0) {
                        continue;
                    }

                    const pieces = [];
                    if (pending > 0) {
                        pieces.push(`${pending} Pending`);
                    }
                    if (completed > 0) {
                        pieces.push(`${completed} Done`);
                    }
                    if (failed > 0) {
                        pieces.push(`${failed} Failed`);
                    }
                    const expectedText = pieces.join(", ");

                    it(expectedText, () => {
                        const jobs = new Map<string, Job>();

                        for (let i = 0; i < numJobs; i++) {
                            let progress;
                            if (i < completed) {
                                progress = true;
                            } else if (i < completed + failed) {
                                progress = false;
                            } else {
                                progress = 0.5;
                            }

                            jobs.set(`job-${i}`, {
                                name: `Job ${i}`,
                                description: `Description ${i}`,
                                progress,
                                direction: "upload",
                            });
                        }

                        mountComponent({ jobs }, true, () => {});
                        cy.get("ion-modal ion-title").contains(expectedText).should("be.visible");
                    });
                }
            }
        }
    });
});
