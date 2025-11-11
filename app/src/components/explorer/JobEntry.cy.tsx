import { mount } from "cypress/react";

import { IonApp } from "@ionic/react";

import JobEntry, { Job } from "./JobEntry";

describe("<JobEntry />", () => {
    function mountComponent(props: Job) {
        mount(
            <IonApp>
                <JobEntry {...props} />
            </IonApp>,
        );
    }

    const baseJob: Job = {
        filename: "my-file.zip",
        status: "Uploading",
        progress: 0.5,
    };

    it("renders the filename, status, and progress bar", () => {
        mountComponent(baseJob);

        cy.get("ion-label").contains(baseJob.filename).should("be.visible");
        cy.get("ion-label").contains(baseJob.status).should("be.visible");
        cy.get(".circular-progress-bar").should("be.visible");
    });

    it("displays different statuses correctly", () => {
        const job: Job = { ...baseJob, status: "My Custom Status" };
        mountComponent(job);

        cy.get("ion-label").contains("My Custom Status").should("be.visible");
    });

    it("truncates a long filename", () => {
        const longFilename = "this-is-a-very-long-filename-that-should-be-truncated.zip";
        const job: Job = { ...baseJob, filename: longFilename };
        mountComponent(job);

        cy.get("ion-label.truncate").should("have.text", longFilename);
        cy.get("ion-label.truncate").should("have.class", "truncate");
    });

    it("displays an indeterminate progress bar when progress is null", () => {
        const job: Job = { ...baseJob, progress: null };
        mountComponent(job);

        cy.get(".circular-progress-bar").should("not.have.attr", "aria-valuenow");
    });

    it("passes the correct progress value to the CircularProgressBar", () => {
        const job: Job = { ...baseJob, progress: 0.75 };
        mountComponent(job);

        cy.get(".circular-progress-bar").should("have.attr", "aria-valuenow", "75");
    });
});
