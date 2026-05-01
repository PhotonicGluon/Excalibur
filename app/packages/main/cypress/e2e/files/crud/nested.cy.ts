import { createFile, createFolder } from "../helpers";

describe("Nested Operations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");

        // Create super folder
        const superFolderName = createFolder();
        const superFolder = cy.get(`div[data-name='${superFolderName}']`);
        superFolder.should("exist");
        superFolder.should("contain.text", superFolderName);

        // Go in
        superFolder.click();
        cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should have a working back to parent folder button", () => {
        cy.get("#files-area").contains("(Go Back)").click();
        cy.url().should("equal", `${Cypress.config().baseUrl}/files/`);
    });

    it("should create nested folder", () => {
        createFolder();
    });

    it("should create nested file", () => {
        createFile(1000);
    });
});
