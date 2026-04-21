import * as path from "path";

import { DOWNLOADS_FOLDER, createFile } from "./helpers";

describe("cancellations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should handle upload cancellations", () => {
        // Create a file upload task
        const fileName = createFile(1e6, true)[0];

        // Check that the job is listed
        cy.get("#jobs-summary").click();
        cy.get("#jobs-popover").should("exist");
        cy.get("#jobs-popover").should("not.have.text", "No active jobs");

        const jobEntry = cy.get(".grid");
        jobEntry.should("contain.text", fileName);

        // Cancel the job
        jobEntry.get(".circular-progress-bar").parent().click();

        cy.get("#jobs-popover").should("have.text", "No active jobs");
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
    });

    it("should handle download cancellations", () => {
        // Upload a file
        const fileName = createFile(1e6, true)[0];
        const fileElement = cy.get(`div[data-name='${fileName}']`);
        fileElement.should("exist");

        // Create a file download task
        fileElement.click();

        // Check that the job is listed
        cy.get("#jobs-summary").click();
        cy.get("#jobs-popover").should("exist");
        cy.get("#jobs-popover").should("not.have.text", "No active jobs");

        const jobEntry = cy.get(".grid");
        jobEntry.should("contain.text", fileName);

        // Cancel the job
        jobEntry.get(".circular-progress-bar").parent().click();

        cy.get("#jobs-popover").should("have.text", "No active jobs");
        cy.readFile(path.join(DOWNLOADS_FOLDER, fileName)).should("not.exist");
    });
});
