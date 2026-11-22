import { SMALL_SIZE } from "../constants";
import { createFile, createFolder, expectToast } from "../helpers";

describe("Moving Operations", () => {
    let fileName: string;
    let folderName: string;

    const SERVER_URL = Cypress.expose("serverURL");

    beforeEach(() => {
        cy.signup(SERVER_URL, "test-user", "Password", false);
        cy.login(SERVER_URL, "test-user", "Password");

        // Create test file and folder
        fileName = createFile(SMALL_SIZE, true)[0];
        folderName = createFolder();
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest?.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should handle simple moving", () => {
        // Clicking on move button should bring up move dialog
        cy.get(`div[data-name='${fileName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${fileName}']`).rightclick();
        cy.get(".item").contains("Move").click();
        cy.get("#move-modal ion-title").should("have.text", "Select Destination");

        // Click into destination folder and confirm move
        cy.get(`#move-modal div[data-name='${folderName}']`).click();
        cy.get("#move-modal-confirm").click();
        cy.get("#move-modal").should("not.be.visible");

        // Check that file was moved
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
        cy.get(`div[data-name='${folderName}']`).click();
        cy.get(`div[data-name='${fileName}']`).should("exist");
    });

    it("should handle complex moving", () => {
        // Make nested folder
        cy.get(`div[data-name='${folderName}']`).click();
        const nestedFolderName = createFolder();
        cy.get("#files-area").contains("(Go Back)").click();
        cy.get(`div[data-name='${folderName}']`).should("exist");

        // Clicking on move button should bring up move dialog
        cy.get(`div[data-name='${fileName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${fileName}']`).rightclick();
        cy.get(".item").contains("Move").click();

        // Go into destination, then nested, then back out
        cy.get(`#move-modal div[data-name='${folderName}']`).click();
        cy.get(`#move-modal div[data-name='${nestedFolderName}']`).click();
        cy.get("#move-modal").contains("(Go Back)").click();
        cy.get(`#move-modal div[data-name='${nestedFolderName}']`).should("exist"); // Should be back out

        // Actually move file into nested
        cy.get(`#move-modal div[data-name='${nestedFolderName}']`).click();
        cy.get("#move-modal-confirm").click();

        // Check that file was moved correctly
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
        cy.get(`div[data-name='${folderName}']`).click();
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
        cy.get(`div[data-name='${nestedFolderName}']`).click();
        cy.get(`div[data-name='${fileName}']`).should("exist");
    });

    it("should handle moving non-empty folder", () => {
        // Put a nested folder into the folder to be moved
        cy.get(`div[data-name='${folderName}']`).click();
        const nestedFolderName = createFolder();
        cy.get("#files-area").contains("(Go Back)").click();

        // Make the destination
        const destFolderName = createFolder();

        // Move the folder with the nested folder
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Move").click();
        cy.get(`#move-modal div[data-name='${destFolderName}']`).click();
        cy.get("#move-modal-confirm").click();
        cy.get("#move-modal").should("not.be.visible");

        // Folder (and its contents) should have moved with their names intact
        cy.pullRefresh();
        cy.get(`div[data-name='${folderName}']`).should("not.exist");
        cy.get(`div[data-name='${destFolderName}']`).click();
        cy.get(`div[data-name='${folderName}']`).should("exist");
        cy.get(`div[data-name='${folderName}']`).click();
        cy.get(`div[data-name='${nestedFolderName}']`).should("exist");
    });

    it("should not move folder into its own descendant", () => {
        // Make nested folder
        cy.get(`div[data-name='${folderName}']`).click();
        const nestedFolderName = createFolder();
        cy.get("#files-area").contains("(Go Back)").click();

        // Try to move the folder into the nested folder
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Move").click();
        cy.get(`#move-modal div[data-name='${folderName}']`).click();
        cy.get(`#move-modal div[data-name='${nestedFolderName}']`).click();
        cy.get("#move-modal-confirm").click();

        // Should be rejected
        expectToast(
            "Failed to move item: Cannot move root directory, or move a directory into itself or one of its subdirectories",
            "danger",
        );
        cy.get("#move-modal-close").click();

        // Folder should still be where it was
        cy.pullRefresh();
        cy.get(`div[data-name='${folderName}']`).should("exist");
    });
});
