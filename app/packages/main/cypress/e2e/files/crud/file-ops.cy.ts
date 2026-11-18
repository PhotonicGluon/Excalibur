import { LARGE_SIZE, SMALL_SIZE } from "../constants";
import { createFile, createFolder, expectToast, renameItem } from "../helpers";

const SERVER_URL = Cypress.expose("serverURL");

beforeEach(() => {
    cy.signup(SERVER_URL, "test-user", "Password", false);
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
    it("should rename folder", () => {
        // Create test item
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).should("exist");

        // Rename it
        const newName = `New Name ${Date.now()}`;
        renameItem(folderName, newName);
        expectToast("Item renamed");

        cy.get(`div[data-name='${folderName}']`).should("not.exist");
        cy.get(`div[data-name='${newName}']`).should("exist");

        // The new name should come back from the server, both on refresh and on a new session
        cy.pullRefresh();
        cy.get(`div[data-name='${newName}']`).should("exist");
        cy.get(`div[data-name='${folderName}']`).should("not.exist");
        cy.login(SERVER_URL, "test-user", "Password");
        cy.get(`div[data-name='${newName}']`).should("exist");
        cy.get(`div[data-name='${folderName}']`).should("not.exist");
    });

    it("should rename file", () => {
        // Create test item
        const [fileName] = createFile(SMALL_SIZE);
        cy.get(`div[data-name='${fileName}']`).should("exist");

        // Rename it
        const newName = `new-name-${Date.now()}.txt`;
        renameItem(fileName, newName);
        expectToast("Item renamed");

        cy.get(`div[data-name='${fileName}']`).should("not.exist");
        cy.get(`div[data-name='${newName}']`).should("exist");

        // The new name should come back from the server
        cy.pullRefresh();
        cy.get(`div[data-name='${newName}']`).should("exist");
        cy.get(`div[data-name='${fileName}']`).should("not.exist");
    });

    it("should keep children when renaming non-empty folder", () => {
        // Create folder with a nested folder
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).click();
        cy.wait(100); // Make sure navigation completes
        const childName = createFolder();
        cy.get("#files-area").contains("(Go Back)").click();

        // Rename the parent
        const newName = `New Name ${Date.now()}`;
        renameItem(folderName, newName);
        cy.get(`div[data-name='${newName}']`).should("exist");
        cy.get(`div[data-name='${folderName}']`).should("not.exist");

        // Child should still be there, under the same name
        cy.get(`div[data-name='${newName}']`).click();
        cy.get(`div[data-name='${childName}']`).should("exist");
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

    it("should allow reuse of the name of a deleted folder", () => {
        // Create then delete folder
        const folderName = createFolder();
        cy.get(`div[data-name='${folderName}']`).scrollIntoView(); // Make sure its visible
        cy.wait(100); // Make sure scroll completes
        cy.get(`div[data-name='${folderName}']`).rightclick();
        cy.get(".item").contains("Delete").click();
        cy.get(`div[data-name='${folderName}']`).should("not.exist");
        cy.get("ion-toast", { timeout: 10000 }).should("not.exist");

        // Creating a folder with the same name should now work
        createFolder(folderName);
        cy.get(`div[data-name='${folderName}']`).should("exist");
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
        cy.wait(100); // Make sure navigation completes
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
