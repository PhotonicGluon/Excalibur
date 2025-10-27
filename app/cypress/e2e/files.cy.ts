import * as path from "path";

describe("Check Files Page Contents", () => {
    it("should redirect to server choice if not onboarded", () => {
        cy.visit("/files/");
        cy.url().should("include", "/server-choice");
    });

    it("should redirect to login if onboarded but not logged in", () => {
        cy.onboard("http://127.0.0.1:8989");
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should stay on files page if logged in", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");

        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
        cy.get('.breadcrumb-active > [slot=""]').should("exist");
    });
});

describe("Check File Page Operations", () => {
    it("should handle folder creation", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");

        // Clicking on create folder should have popup
        cy.get(".fab-horizontal-end").click();
        cy.get('[aria-label="Create Folder"]').click();
        cy.get(".alert-head").should("have.text", "Enter Folder Name");

        // Enter test folder name
        const folderName = `Test Folder ${Date.now()}`;
        cy.get(".alert-input-wrapper").click().wait(100); // For the focus to appear
        cy.get(".alert-input-wrapper").type(folderName);

        // Click confirm
        cy.get(".alert-button-group > :nth-child(2) > .alert-button-inner").click();
        cy.get(".alert-head").should("not.exist");

        // Folder should have been created
        cy.get(".h-16 > ion-grid.md").should("exist");
        cy.get(".h-16 > ion-grid.md").should("contain.text", folderName);
    });

    it("should handle file upload and download", () => {
        const downloadsFolder = Cypress.config("downloadsFolder");

        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");

        // Upload the test file
        const fileName = `test-file-${Date.now()}.txt`;
        cy.fixture("1 kB File.txt", null).as("testFile");
        cy.get("#main-content").selectFile({ contents: "@testFile", fileName: fileName }, { action: "drag-drop" });

        // File should have been uploaded
        const fileElement = cy.get(`div[data-name='${fileName}']`);
        fileElement.should("exist");
        fileElement.should("contain.text", fileName);

        // Try downloading the file
        fileElement.click();
        cy.readFile(path.join(downloadsFolder, fileName)).should("exist");
    });
});
