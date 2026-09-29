import { createFile, createFolder } from "../helpers";

const SERVER_URL = Cypress.expose("serverURL");
const FILE_SIZE = 64; // Just need a small file for testing

// Helper functions
function _createTestAccount(username: string, reduced?: boolean) {
    cy.signup(SERVER_URL, username, "Password", false, false);

    // Wait for listener to connect
    cy.get("#directory-list-stats").should("exist");
    cy.get("#directory-list-stats ion-icon").should("have.attr", "aria-label", "Listener connected");

    // Add test files
    createFile(FILE_SIZE, true);
    let folderName = createFolder();
    cy.get(`div[data-name='${folderName}']`).click();
    cy.wait(100); // Make sure navigation completes
    createFile(FILE_SIZE, true); // Create file within first folder

    if (reduced) {
        cy.get("#files-area").contains("(Go Back)").click();
        return;
    }

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

// Tests
afterEach(function () {
    // Stop other tests if any test fails
    if (this.currentTest?.state === "failed") {
        Cypress.stop();
        return;
    }
});

describe("Migration Operations", () => {
    it("should work with empty vault", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        cy.signup(SERVER_URL, USERNAME, "Password", false, false);

        // Migrate vault to use Merkle tree validation
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        _verifyVault();
    });

    it("should work with filled vault", () => {
        _createTestAccount(`merkle-test-user-${Date.now()}`);

        // Migrate vault to use Merkle tree validation
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        _verifyVault();
    });

    it("should recover from interruptions gracefully", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        _createTestAccount(USERNAME, true);

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
});

describe("Verification Operations", () => {
    it("should verify file/folder if fully migrated", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        _createTestAccount(USERNAME, true);

        // Migrate vault to use Merkle tree validation
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.get("#merkle-migration-banner").should("not.exist");

        // Attempting to verify file should work
        cy.get("ion-item").contains("test-file").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-success").should("exist");
        cy.get("ion-toast", { timeout: 10000 }).should("not.exist"); // Wait for toast to dismiss

        // Attempting to verify folder should work
        cy.get("ion-item").contains("Test Folder").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-success").should("exist");
    });

    it("should not verify file/folder if not migrated", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        _createTestAccount(USERNAME, true);

        // Attempting to verify file should fail
        cy.get("ion-item").contains("test-file").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-danger").should("exist");
        cy.get("ion-toast", { timeout: 10000 }).should("not.exist"); // Wait for toast to dismiss

        // Attempting to verify folder should fail
        cy.get("ion-item").contains("Test Folder").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-danger").should("exist");
    });

    it("should not verify file/folder if migration was interrupted", () => {
        const USERNAME = `merkle-test-user-${Date.now()}`;
        _createTestAccount(USERNAME, true);

        // Start migrating vault
        cy.get("#merkle-migration-banner").should("exist");
        cy.get("#merkle-migration-banner ion-button").contains("Start Now").click();
        cy.reload(); // Immediately reload to trigger migration interruption

        cy.login(SERVER_URL, USERNAME, "Password", false, true);
        cy.get("#merkle-migration-banner").contains("interrupted").should("exist");

        // Attempting to verify file should fail
        cy.get("ion-item").contains("test-file").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-danger").should("exist");
        cy.get("ion-toast", { timeout: 10000 }).should("not.exist"); // Wait for toast to dismiss

        // Attempting to verify folder should fail
        cy.get("ion-item").contains("Test Folder").rightclick();
        cy.get("ion-popover ion-item").contains("Verify").click();
        cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-danger").should("exist");
    });

    // TODO: Add file/folder upload/rename tests
});
