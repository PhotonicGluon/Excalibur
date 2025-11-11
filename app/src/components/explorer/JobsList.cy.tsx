import { mount } from "cypress/react";

import { IonApp } from "@ionic/react";

import { Job } from "./JobEntry";
import JobsList from "./JobsList";

describe("<JobsList />", () => {
    function mountComponent(props: { jobs: Map<string, Job> }) {
        mount(
            <IonApp>
                <JobsList {...props} />
            </IonApp>,
        );
    }

    it("renders the 'No active jobs' message when the jobs map is empty", () => {
        const jobs = new Map<string, Job>();
        mountComponent({ jobs });

        cy.contains("No active jobs").should("be.visible");
    });

    it("does not render the 'No active jobs' message when there are jobs", () => {
        const jobs = new Map<string, Job>([["job1", { filename: "file1.txt", status: "Uploading", progress: 0.25 }]]);
        mountComponent({ jobs });

        cy.contains("No active jobs").should("not.exist");
    });

    it("renders a list of JobEntry components when jobs are provided", () => {
        const jobs = new Map<string, Job>([
            ["job1", { filename: "file1.txt", status: "Uploading", progress: 0.25 }],
            ["job2", { filename: "image.png", status: "Processing", progress: 0.8 }],
            ["job3", { filename: "archive.zip", status: "Complete", progress: 1 }],
        ]);

        mountComponent({ jobs });

        cy.contains(jobs.get("job1")!.filename).should("be.visible");
        cy.contains(jobs.get("job2")!.filename).should("be.visible");
        cy.contains(jobs.get("job3")!.filename).should("be.visible");
        cy.get("div.flex-col").children().should("have.length", 3);
    });

    it("renders a single job entry correctly", () => {
        const jobs = new Map<string, Job>([
            ["single-job", { filename: "document.pdf", status: "Downloading", progress: 0.6 }],
        ]);
        mountComponent({ jobs });

        cy.contains("document.pdf").should("be.visible");
        cy.contains("Downloading").should("be.visible");
        cy.get(".circular-progress-bar").should("have.attr", "aria-valuenow", "60");
        cy.get("div.flex-col").children().should("have.length", 1);
    });
});
