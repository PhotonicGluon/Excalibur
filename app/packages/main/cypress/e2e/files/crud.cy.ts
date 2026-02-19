import { createFile, createFolder } from "./helpers";

const SMALL_SIZE = 1024;
const LARGE_SIZE = 1e6; // Enough for several chunking to occur

describe("CRUD operations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");
    });

    it("should handle folder creation", () => {
        createFolder();
    });

    describe("single-file upload and download", () => {
        it("should handle small file", () => {
            createFile(SMALL_SIZE);
        });

        it("should handle large file", () => {
            createFile(LARGE_SIZE);
        });
    });

    describe("multi-file upload and download", () => {
        it("should handle small files", () => {
            createFile(Array.from({ length: 5 }, () => SMALL_SIZE));
        });

        it("should handle large files", () => {
            createFile(Array.from({ length: 3 }, () => LARGE_SIZE));
        });
    });

    describe("nested operations", () => {
        beforeEach(() => {
            // Create super folder
            const superFolderName = createFolder();
            const superFolder = cy.get(`div[data-name='${superFolderName}']`);
            superFolder.should("exist");
            superFolder.should("contain.text", superFolderName);

            // Go in
            superFolder.click();
            cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);
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

    describe("move items", () => {
        let fileName: string;
        let folderName: string;

        beforeEach(() => {
            // Create test file and folder
            fileName = createFile(SMALL_SIZE, true)[0];
            folderName = createFolder();
        });

        it("should handle simple moving", () => {
            // Clicking on move button should bring up move dialog
            cy.get(`div[data-name='${fileName}']`).scrollIntoView(); // Make sure its visible
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
});
