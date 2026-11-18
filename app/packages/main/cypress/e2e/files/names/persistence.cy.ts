import { SMALL_SIZE, UNICODE_NAME } from "../constants";
import { createFile, createFolder, itemSelector } from "../helpers";

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

describe("Name Persistence", () => {
    it("should decrypt nested names in a new session", () => {
        // Create a nested structure, with a file at the bottom
        const outerName = createFolder(`${UNICODE_NAME} ${Date.now()}`);
        cy.get(itemSelector(outerName)).click();
        cy.wait(100); // Make sure navigation completes
        const innerName = createFolder();
        cy.get(itemSelector(innerName)).click();
        cy.wait(100); // Make sure navigation completes
        const [fileName] = createFile(SMALL_SIZE);

        // Log in again
        cy.login(SERVER_URL, "test-user", "Password");

        // Navigate down to the file
        cy.get(itemSelector(outerName)).click();
        cy.url().should("include", `/files/${encodeURIComponent(outerName)}`);
        cy.get(itemSelector(innerName)).click();
        cy.url().should("include", `/files/${encodeURIComponent(outerName)}/${encodeURIComponent(innerName)}`);
        cy.get(itemSelector(fileName)).should("exist");

        // Breadcrumbs should show the decrypted names
        cy.get("ion-breadcrumb").eq(1).should("contain.text", outerName);
        cy.get("ion-breadcrumb").eq(2).should("contain.text", innerName);
    });

    it("should keep names of folder contents after navigating around", () => {
        const folderName = createFolder();
        cy.get(itemSelector(folderName)).click();
        cy.wait(100); // Make sure navigation completes
        const childNames = [createFolder(), createFolder()];
        cy.get("#files-area").contains("(Go Back)").click();

        // Go in and out of the folder, refreshing from the server each time
        for (let i = 0; i < 2; i++) {
            cy.get(itemSelector(folderName)).click();
            cy.pullRefresh();
            childNames.forEach((childName) => cy.get(itemSelector(childName)).should("exist"));
            cy.get("#files-area").contains("(Go Back)").click();
        }
    });
});
