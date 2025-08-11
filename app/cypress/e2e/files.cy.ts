describe("Check Files Page Contents", () => {
    it("should redirect to index if not logged in", () => {
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should stay on files page if logged in", () => {
        cy.login("http://127.0.0.1:8989", "Password");
        cy.visit("/files/");

        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
        cy.get('.breadcrumb-active > [slot=""]').should("exist");
    });
});

describe("Check File Page Operations", () => {
    it("should handle folder creation", () => {
        cy.exec("cd .. && npm run server:setup-for-test");
        cy.login("http://127.0.0.1:8989", "Password");
        cy.visit("/files/");

        // Check that the original page is empty
        cy.get(".h-16 > ion-grid.md").should("not.exist");

        // Clicking on create folder should have popup
        cy.get(".fab-horizontal-end").click();
        cy.get('[aria-label="Create Folder"]').click();
        cy.get(".alert-head").should("have.text", "Enter Folder Name");

        // Enter test folder name
        cy.get(".alert-input-wrapper").click().wait(100); // For the focus to appear
        cy.get(".alert-input-wrapper").type("My Test Folder");

        // Click confirm
        cy.get(".alert-button-group > :nth-child(2) > .alert-button-inner").click();
        cy.get(".alert-head").should("not.exist");

        // Folder should have been created
        cy.get(".h-16 > ion-grid.md").should("exist");
        cy.get(".h-16 > ion-grid.md").should("contain.text", "My Test Folder");
    });

    // it("should handle file upload", () => {
    //     cy.exec("cd .. && npm run server:setup-for-test");
    //     cy.login("http://127.0.0.1:8989", "Password");
    //     cy.visit("/files/");

    //     // Check that the original page is empty
    //     cy.get(".h-16 > ion-grid.md").should("not.exist");

    //     // Clicking on upload file should have popup
    //     cy.get(".fab-horizontal-end").click();
    //     cy.get('[aria-label="Upload File"]').click();
    // });
});
