import { createFile, createFolder } from "../helpers";
import { LARGE_SIZE, SMALL_SIZE } from "./constants";

const SERVER_URL = Cypress.expose("serverURL");

beforeEach(() => {
    cy.signup(SERVER_URL, "test-user", "Password", false, false);
    cy.login(SERVER_URL, "test-user", "Password");

    // Wait for listener to connect
    cy.get("#directory-list-stats").should("exist");
    cy.get("#directory-list-stats ion-icon").should("have.attr", "aria-label", "Listener connected");
});

afterEach(function () {
    // Stop other tests if any test fails
    if (this.currentTest?.state === "failed") {
        Cypress.stop();
        return;
    }
});

describe("Upload and Download Operations", () => {
    describe("Single-file Upload and Download", () => {
        it("should handle small file", () => {
            createFile(SMALL_SIZE);
        });

        it("should handle large file", () => {
            createFile(LARGE_SIZE);
        });
    });

    describe("Multi-file Upload and Download", () => {
        it("should handle small files", () => {
            createFile(Array.from({ length: 5 }, () => SMALL_SIZE));
        });

        it("should handle large files", () => {
            createFile(Array.from({ length: 3 }, () => LARGE_SIZE));
        });
    });
});

describe("Rename Operations", () => {
    it("should rename item", () => {
        // Create test item
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).should("exist");

        // Click on rename button
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Rename").click();

        cy.get(".alert-head").should("have.text", "Enter New Name");

        // Enter test folder name
        const newName = `New Name ${Date.now()}`;
        cy.get(".alert-input-wrapper").find("input").click().wait(100); // For the focus to appear
        cy.get(".alert-input-wrapper")
            .find("input")
            .type("{selectAll}" + newName);
        cy.get(".alert-button-group").contains("Rename").click();
        cy.get(".alert-head").should("not.exist");

        cy.get(`div[data-name='${folderName}']`).should("not.exist");
        cy.get(`div[data-name='${newName}']`).should("exist");
    });
});

describe("Deletion Operations", () => {
    it("should delete file", () => {
        // Create file
        const [fileName] = createFile(SMALL_SIZE);
        cy.get(`div[data-name='${fileName}']`).should("exist");

        // Click on delete button
        cy.get(`div[data-name='${fileName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${fileName}']`).rightclick();
        cy.get(".item").contains("Delete").click();

        cy.get(`div[data-name='${fileName}']`).should("not.exist");
    });

    it("should delete empty folder", () => {
        // Create folder
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).should("exist");

        // Click on delete button
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Delete").click();

        cy.get(`div[data-name='${folderName}']`).should("not.exist");
    });

    it("should delete non-empty folder", () => {
        // Create folder
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).click();
        createFolder(); // Creates a folder within the original folder
        cy.get("#files-area").contains("(Go Back)").click();

        // Click on delete button
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Delete").click();

        // Confirm the deletion
        cy.get(".alert-wrapper").should("exist");
        cy.get(".alert-wrapper").contains("Delete").click();
        cy.get(`div[data-name='${folderName}']`).should("not.exist");
    });
});
