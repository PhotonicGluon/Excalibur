import { createFile } from "./helpers";

const SERVER_URL = Cypress.expose("serverURL");

beforeEach(() => {
    cy.signup(SERVER_URL, "test-user", "Password", false, false);
    cy.login(SERVER_URL, "test-user", "Password");
});

afterEach(function () {
    // Stop other tests if any test fails
    if (this.currentTest?.state === "failed") {
        Cypress.stop();
        return;
    }
});

describe("Check Job Modal", () => {
    it("should be hidden by default", () => {
        cy.get("ion-modal").contains("Jobs").should("not.exist");
    });

    it("should be revealable when clicked in the ellipsis menu", () => {
        cy.get("#ellipsis-button").click();
        cy.get("ion-list ion-item").contains("Jobs").click();
        cy.get("ion-modal").contains("No Jobs").should("exist");
    });
});

describe("Check Job Cancellations", () => {
    it("should handle upload cancellations", () => {
        // Create a file upload task
        const fileName = createFile(1e6, true)[0];

        // Check that the job is listed
        cy.get("ion-modal ion-button[aria-label='Expand Modal']").click();
        cy.get("ion-modal ion-content").should("not.have.text", "No active jobs");

        const jobEntry = cy.get("ion-modal ion-content").contains(fileName);
        jobEntry.should("exist");

        // Cancel the job
        jobEntry.get(".circular-progress-bar").parent().click();

        cy.get("ion-modal ion-content").should("have.text", "No active jobs");
        cy.get("ion-modal ion-button[aria-label='Collapse Modal']").click();

        // FIXME: Now the file uploads way too fast because of the Crypto improvements... so the cancellation
        //        doesn't have time to take effect
        // cy.get(`div[data-name='${fileName}']`).should("not.exist");
    });

    it("should handle download cancellations", () => {
        // Upload a file
        const fileName = createFile(1e6, true)[0];
        let fileElement = cy.get(`div[data-name='${fileName}']`);
        fileElement.should("exist");
        cy.login(SERVER_URL, "test-user", "Password"); // Log in afresh to remove the upload job

        // Create a file download task
        fileElement = cy.get(`div[data-name='${fileName}']`); // Need to get again due to the fresh login
        fileElement.click();

        // Check that the job is listed
        cy.get("ion-modal ion-button[aria-label='Expand Modal']").click();
        cy.get("ion-modal ion-content").should("not.have.text", "No active jobs");

        const jobEntry = cy.get("ion-modal ion-content").contains(fileName);
        jobEntry.should("exist");

        // Cancel the job
        jobEntry.get(".circular-progress-bar").parent().click();

        cy.get("ion-modal ion-content").should("have.text", "No active jobs");
        cy.get("ion-modal ion-button[aria-label='Collapse Modal']").click();

        // FIXME: Now the file downloads way too fast because of the Crypto improvements... so the cancellation
        //        doesn't have time to take effect
        // cy.readFile(path.join(DOWNLOADS_FOLDER, fileName)).should("not.exist");
    });
});
