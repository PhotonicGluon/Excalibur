import { createFolder } from "./helpers";

describe("Check Breadcrumbs", () => {
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

    it("should handle single-nested folder", () => {
        // Create super folder
        const superFolderName = createFolder();
        const superFolder = cy.get(`div[data-name='${superFolderName}']`);
        superFolder.should("exist");
        superFolder.should("contain.text", superFolderName);

        // Go in
        superFolder.click();
        cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);

        // Check breadcrumbs
        cy.get("ion-breadcrumbs").should("exist");
        cy.get("ion-breadcrumb").eq(1).should("contain.text", superFolderName);
        cy.get("ion-breadcrumb").eq(0).click(); // Click on home
        cy.url().should("include", "/files");
        cy.get("ion-breadcrumbs").children().should("have.length", 1);
    });

    it("should handle multi-nested folder", () => {
        const NUM_NESTED_FOLDERS = 3;

        // Create folders
        let path = "/files";
        const folderNames = [];
        const folders = [];
        for (let i = 0; i < NUM_NESTED_FOLDERS; i++) {
            const aFolderName = createFolder();
            const aFolder = cy.get(`div[data-name='${aFolderName}']`);
            aFolder.should("exist");

            folderNames.push(aFolderName);
            folders.push(aFolder);

            aFolder.click();
            path += `/${encodeURIComponent(aFolderName)}`;
            cy.url().should("include", path);
        }

        // Check breadcrumb names
        cy.get("ion-breadcrumbs").should("exist");
        for (let i = NUM_NESTED_FOLDERS - 1; i >= 0; i--) {
            cy.get("ion-breadcrumb")
                .eq(i + 1)
                .should("contain.text", folderNames[i]);
        }

        // Check breadcrumb redirections
        for (let i = NUM_NESTED_FOLDERS - 1; i >= 0; i--) {
            cy.get("ion-breadcrumb").eq(i).click();
            let expectedPath = "/files";
            for (let j = 0; j < i; j++) {
                expectedPath += `/${encodeURIComponent(folderNames[j])}`;
            }
            cy.url().should("include", expectedPath);
            cy.get("ion-breadcrumbs")
                .children()
                .should("have.length", i + 1);
        }
    });
});
