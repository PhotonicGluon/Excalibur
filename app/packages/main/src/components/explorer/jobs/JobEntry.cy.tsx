import { mount } from "cypress/react";

import { IonApp } from "@ionic/react";
import { arrowDown, arrowUp } from "ionicons/icons";

import JobEntry, { Job } from "./JobEntry";

describe("<JobEntry />", () => {
    function mountComponent(props: Job, onCancel?: () => void) {
        mount(
            <IonApp>
                <JobEntry {...props} onCancel={onCancel ?? (() => {})} />
            </IonApp>,
        );
    }

    const baseJob: Job = {
        direction: "upload",
        name: "my-file.zip",
        description: "Uploading",
        progress: 0.5,
    };

    it("renders the filename, status, and progress bar", () => {
        mountComponent(baseJob);

        cy.get("ion-label").contains(baseJob.name).should("be.visible");
        cy.get("ion-note").contains(baseJob.description).should("be.visible");
        cy.get(".circular-progress-bar").should("be.visible");
    });

    describe("display different directions", () => {
        it("upload", () => {
            const job: Job = { ...baseJob, direction: "upload" };
            mountComponent(job);

            cy.get("ion-icon").should("have.attr", "icon", arrowUp);
        });
        it("download", () => {
            const job: Job = { ...baseJob, direction: "download" };
            mountComponent(job);

            cy.get("ion-icon").should("have.attr", "icon", arrowDown);
        });
    });

    it("cancels the job when onCancel is called", () => {
        const onCancel = cy.stub();
        const job: Job = { ...baseJob, progress: 0.5 };
        mountComponent(job, onCancel);

        const cancelArea = cy.get(".group");
        cancelArea.should("exist");
        cancelArea.click();
        cy.wrap(onCancel).should("have.been.called");
    });

    it("displays different descriptions correctly", () => {
        const job: Job = { ...baseJob, description: "My Custom Description" };
        mountComponent(job);

        cy.get("ion-note").contains("My Custom Description").should("be.visible");
    });

    it("truncates a long filename", () => {
        const longFilename = "this-is-a-very-long-filename-that-should-be-truncated.zip";
        const job: Job = { ...baseJob, name: longFilename };
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
