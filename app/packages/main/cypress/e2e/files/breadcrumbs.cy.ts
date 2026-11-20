import { UNICODE_NAME } from "./constants";
import { createFolder, renameItem } from "./helpers";

describe("Check Breadcrumbs", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    beforeEach(() => {
        cy.signup(SERVER_URL, "test-user", "Password", false);
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

    it("should update after renaming a parent folder", () => {
        // Create nested folders
        const superFolderName = createFolder();
        cy.get(`div[data-name='${superFolderName}']`).click();
        cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);
        const subFolderName = createFolder();
        cy.get("ion-breadcrumb").eq(0).click(); // Click on home

        // Rename the parent
        const newName = `New Name ${Date.now()}`;
        renameItem(superFolderName, newName);
        cy.get(`div[data-name='${newName}']`).should("exist");

        // Going in should show the new name in the URL and breadcrumbs
        cy.get(`div[data-name='${newName}']`).click();
        cy.url().should("include", `/files/${encodeURIComponent(newName)}`);
        cy.get("ion-breadcrumb").eq(1).should("contain.text", newName);

        // Child should still be there, and its path should be built from the new parent name
        cy.get(`div[data-name='${subFolderName}']`).click();
        cy.url().should("include", `/files/${encodeURIComponent(newName)}/${encodeURIComponent(subFolderName)}`);
        cy.get("ion-breadcrumb").eq(1).should("contain.text", newName);
        cy.get("ion-breadcrumb").eq(2).should("contain.text", subFolderName);
    });

    it("should handle folder with unicode name", () => {
        const folderName = createFolder(`${UNICODE_NAME} ${Date.now()}`);
        cy.get(`div[data-name='${folderName}']`).click();
        cy.url().should("include", `/files/${encodeURIComponent(folderName)}`);

        // Breadcrumb should show the decrypted name
        cy.get("ion-breadcrumb").eq(1).should("contain.text", folderName);

        // Name should survive logging in again (the keys do not survive a reload)
        cy.login(SERVER_URL, "test-user", "Password");
        cy.get(`div[data-name='${folderName}']`).click();
        cy.get("ion-breadcrumb").eq(1).should("contain.text", folderName);
    });
});
