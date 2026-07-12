import { createFile, createFolder } from "../helpers";
import { SMALL_SIZE } from "./constants";

describe("Moving Operations", () => {
    let fileName: string;
    let folderName: string;

    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");

        // Create test file and folder
        fileName = createFile(SMALL_SIZE, true)[0];
        folderName = createFolder();
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest.state === "failed") {
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
});
