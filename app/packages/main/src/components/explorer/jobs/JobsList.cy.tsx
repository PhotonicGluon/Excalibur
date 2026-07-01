import { mount } from "cypress/react";

import { IonApp } from "@ionic/react";

import { Job } from "./JobEntry";
import JobsList from "./JobsList";
import { jobsContext } from "./context";

describe("<JobsList />", () => {
    function mountComponent(props: { jobs: Map<string, Job> }, onCancelJob?: () => void) {
        mount(
            <IonApp>
                <jobsContext.Provider
                    value={{
                        jobs: props.jobs ?? new Map(),
                        addJob: (_id: string, _job: Job) => {},
                        getJob: (_id: string) => {
                            return { id: _id, name: "", description: "", progress: 0, direction: "upload" };
                        },
                        updateJob: (_id: string, _newStatus: string, _newProgress?: number | null) => {},
                        updateProgress: (_id: string, _newProgress: number | null) => {},
                        cancelJob: onCancelJob ?? (() => {}),
                        deleteJob: (_id: string) => {},
                        clearComplete: () => {},
                    }}
                >
                    <JobsList />
                </jobsContext.Provider>
            </IonApp>,
        );
    }

    it("renders the 'No active jobs' message when the jobs map is empty", () => {
        const jobs = new Map<string, Job>();
        mountComponent({ jobs });

        cy.contains("No active jobs").should("be.visible");
    });

    it("does not render the 'No active jobs' message when there are jobs", () => {
        const jobs = new Map<string, Job>([
            ["job1", { name: "file1.txt", direction: "upload", description: "Uploading", progress: 0.25 }],
        ]);
        mountComponent({ jobs });

        cy.contains("No active jobs").should("not.exist");
    });

    it("renders a list of JobEntry components when jobs are provided", () => {
        const jobs = new Map<string, Job>([
            ["job1", { name: "file1.txt", direction: "upload", description: "Uploading", progress: 0.25 }],
            ["job2", { name: "image.png", direction: "upload", description: "Processing", progress: 0.8 }],
            ["job3", { name: "archive.zip", direction: "upload", description: "Complete", progress: true }],
        ]);

        mountComponent({ jobs });

        cy.contains(jobs.get("job1")!.name).should("be.visible");
        cy.contains(jobs.get("job2")!.name).should("be.visible");
        cy.contains(jobs.get("job3")!.name).should("be.visible");
        cy.get("div.flex-col").children().should("have.length", 3);
    });

    it("renders a single job entry correctly", () => {
        const jobs = new Map<string, Job>([
            ["single-job", { name: "document.pdf", direction: "download", description: "Downloading", progress: 0.6 }],
        ]);
        mountComponent({ jobs });

        cy.contains("document.pdf").should("be.visible");
        cy.contains("Downloading").should("be.visible");
        cy.get(".circular-progress-bar").should("have.attr", "aria-valuenow", "60");
        cy.get("div.flex-col").children().should("have.length", 1);
    });
});
