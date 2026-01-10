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

    it("should move items", () => {
        // Create test file and folder
        const fileName = createFile(SMALL_SIZE, true)[0];
        const folderName = createFolder();

        // Move file to folder
        cy.get(`div[data-name='${fileName}']`).rightclick();
        cy.get(".item").contains("Move").click().wait(200); // Wait for the alert to appear
        cy.get(".alert-input-wrapper").type(`{backspace}./${folderName}`);
        cy.get(".alert-button-group").contains("Move").click();
        cy.get(".alert-head").should("not.exist");

        // Check that file was moved
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
        cy.get(`div[data-name='${folderName}']`).click();
        cy.get(`div[data-name='${fileName}']`).should("exist");
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
            createFile(Array.from({ length: 10 }, () => SMALL_SIZE));
        });

        it("should handle large files", () => {
            createFile(Array.from({ length: 5 }, () => LARGE_SIZE));
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
});
