import { createFile, createFolder } from "../helpers";

const SERVER_URL = Cypress.expose("serverURL");
const FILE_SIZE = 64; // Just need a small file for testing

function _createTestAccount(username: string) {
    cy.signup(SERVER_URL, username, "Password", false, false);
    cy.login(SERVER_URL, username, "Password", false, true); // FIXME: Somehow without logging in again tests fail

    // Wait for listener to connect
    cy.get("#directory-list-stats").should("exist");
    cy.get("#directory-list-stats ion-icon").should("have.attr", "aria-label", "Listener connected");

    // Add test files
    createFile(FILE_SIZE, true);
    let folderName = createFolder();
    cy.get(`div[data-name='${folderName}']`).click();
    cy.wait(100); // Make sure navigation completes
    createFile(FILE_SIZE, true); // Create file within first folder
    folderName = createFolder(); // Creates a folder within that folder
    cy.get(`div[data-name='${folderName}']`).click();
    cy.wait(100); // Make sure navigation completes
    createFile(FILE_SIZE); // Create nested file
    cy.get("#files-area").contains("(Go Back)").click();
    cy.get("#files-area").contains("(Go Back)").click();
}

function _verifyVault() {
    cy.gotoPreferences();
    cy.get("#preferences-data").click();
    cy.get("ion-button").contains("Check Now").click();
    cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-success").should("exist");
}

afterEach(function () {
    // Stop other tests if any test fails
    if (this.currentTest?.state === "failed") {
        Cypress.stop();
        return;
    }
});

describe("Merkle Operations", () => {
    it("should migrate empty vault successfully", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        cy.signup(SERVER_URL, USERNAME, "Password", false, false);
        cy.login(SERVER_URL, USERNAME, "Password", false, true); // FIXME: Somehow without logging in again tests fail

        // Migrate vault to use Merkle tree validation
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        _verifyVault();
    });

    it("should migrate vault successfully", () => {
        _createTestAccount(`merkle-test-user-${Date.now()}`);

        // Migrate vault to use Merkle tree validation
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        _verifyVault();
    });

    it("should recover from interruptions gracefully", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        _createTestAccount(USERNAME);

        // Start migrating vault
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.reload(); // Immediately reload to trigger migration interruption

        cy.login(SERVER_URL, USERNAME, "Password", false, true);
        cy.get("#merkle-migration-banner").contains("interrupted").should("exist");

        // Resume migration
        cy.get("#merkle-migration-banner ion-button").contains("Resume").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        _verifyVault();
    });

    // TODO: Add file verification test

    // TODO: Add non-migrated verification test

    // TODO: Add midway-migration verification test

    // TODO: Add file/folder upload/rename tests
});
