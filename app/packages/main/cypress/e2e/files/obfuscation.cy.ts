import * as path from "path";

import { TINY_SIZE } from "./crud/constants";
import { DOWNLOADS_FOLDER, createFile, createFolder } from "./helpers";

const SERVER_URL = Cypress.expose("serverURL");
const RENAME_PAGE_SIZE = 100; // Must match `RENAME_PAGE_SIZE` in `obfuscation.ts`

/**
 * Names of the items in a test vault.
 */
interface VaultContents {
    rootFile: string;
    folder: string;
    folderFile: string;
    subfolder?: string; // Only present in a full vault
    subfolderFile?: string; // Only present in a full vault
}

// Helper functions
/**
 * Creates a test account and fills the vault with a nested set of files and folders.
 *
 * The files are only dropped (and not downloaded) so that they can be downloaded later on, after
 * the obfuscation has been toggled.
 *
 * @param username name of the user to create
 * @param obfuscatedNames whether the account starts with obfuscated names
 * @param reduced whether to create a reduced vault (without the nested subfolder) for quicker testing
 * @returns the names of the items that were created
 */
function _createTestAccount(username: string, obfuscatedNames: boolean, reduced?: boolean): VaultContents {
    cy.signup(SERVER_URL, username, "Password", obfuscatedNames, false);

    // Wait for listener to connect
    cy.get("#directory-list-stats").should("exist");
    cy.get("#directory-list-stats ion-icon").should("have.attr", "aria-label", "Listener connected");

    // Add test files
    const rootFile = createFile(TINY_SIZE, true)[0];
    const folder = createFolder();
    cy.get(`div[data-name='${folder}']`).click();
    cy.wait(100); // Make sure navigation completes
    const folderFile = createFile(TINY_SIZE, true)[0]; // Create file within first folder

    if (reduced) {
        cy.get("#files-area").contains("(Go Back)").click();
        return { rootFile, folder, folderFile };
    }

    const subfolder = createFolder(); // Creates a folder within that folder
    cy.get(`div[data-name='${subfolder}']`).click();
    cy.wait(100); // Make sure navigation completes
    const subfolderFile = createFile(TINY_SIZE, true)[0]; // Create nested file
    cy.get("#files-area").contains("(Go Back)").click();
    cy.get("#files-area").contains("(Go Back)").click();

    return { rootFile, folder, folderFile, subfolder, subfolderFile };
}

/**
 * Toggles the obfuscation of names in the "data preferences", then returns to the files page.
 *
 * @param expectedState the expected state of the obfuscation toggle once the toggle is complete
 */
function _toggleObfuscation(expectedState: boolean) {
    cy.gotoPreferences();
    cy.get("#preferences-data").click();
    cy.get("#use-obfuscated-names").should("have.prop", "checked", !expectedState);

    // Toggle and confirm
    cy.get("#use-obfuscated-names").click();
    cy.get(".alert-button-group").contains("button", "Continue").click();

    // Wait for the (de)obfuscation to finish
    cy.get("ion-loading", { timeout: 60000 }).should("not.be.visible");
    cy.get("ion-toast", { timeout: 10000 }).should("have.class", "ion-color-success");
    cy.get("#use-obfuscated-names").should("have.prop", "checked", expectedState);

    // Go back to the files page
    cy.get("#data-preferences-back").click();
    cy.url().should("include", "/files");
    cy.get("ion-skeleton-text").should("not.exist"); // Wait for things to load
}

/**
 * Checks that every item in the test vault is shown with its original name.
 *
 * Assumes that the current directory is the root directory, and ends in the root directory.
 *
 * @param contents names of the items in the vault
 */
function _verifyNames(contents: VaultContents) {
    cy.get(`div[data-name='${contents.rootFile}']`).should("exist");

    cy.get(`div[data-name='${contents.folder}']`).should("exist").click();
    cy.wait(100); // Make sure navigation completes
    cy.get(`div[data-name='${contents.folderFile}']`).should("exist");

    if (contents.subfolder && contents.subfolderFile) {
        cy.get(`div[data-name='${contents.subfolder}']`).should("exist").click();
        cy.wait(100); // Make sure navigation completes
        cy.get(`div[data-name='${contents.subfolderFile}']`).should("exist");
        cy.get("#files-area").contains("(Go Back)").click();
    }

    cy.get("#files-area").contains("(Go Back)").click();
}

/**
 * Checks that every file in the test vault can be downloaded.
 *
 * Assumes that the current directory is the root directory, and ends in the root directory.
 * Assumes that the files have not been downloaded before.
 *
 * @param contents names of the items in the vault
 */
function _verifyDownloads(contents: VaultContents) {
    cy.get(`div[data-name='${contents.rootFile}']`).click();
    cy.readFile(path.join(DOWNLOADS_FOLDER, contents.rootFile)).should("exist");

    cy.get(`div[data-name='${contents.folder}']`).click();
    cy.wait(100); // Make sure navigation completes
    cy.get(`div[data-name='${contents.folderFile}']`).click();
    cy.readFile(path.join(DOWNLOADS_FOLDER, contents.folderFile)).should("exist");

    if (contents.subfolder && contents.subfolderFile) {
        cy.get(`div[data-name='${contents.subfolder}']`).click();
        cy.wait(100); // Make sure navigation completes
        cy.get(`div[data-name='${contents.subfolderFile}']`).click();
        cy.readFile(path.join(DOWNLOADS_FOLDER, contents.subfolderFile)).should("exist");
        cy.get("#files-area").contains("(Go Back)").click();
    }

    cy.get("#files-area").contains("(Go Back)").click();
}

// Tests
afterEach(function () {
    // Stop other tests if any test fails
    if (this.currentTest?.state === "failed") {
        Cypress.stop();
        return;
    }
});

describe("Obfuscation Toggling", () => {
    it("should work with empty vault", () => {
        cy.signup(SERVER_URL, `obfuscation-test-user-${Date.now()}`, "Password", true, false);

        _toggleObfuscation(false);
        _toggleObfuscation(true);
    });

    it("should keep names readable after enabling obfuscation", () => {
        const contents = _createTestAccount(`obfuscation-test-user-${Date.now()}`, false, true);

        _toggleObfuscation(true);
        _verifyNames(contents);
    });

    it("should keep names readable after disabling obfuscation", () => {
        const contents = _createTestAccount(`obfuscation-test-user-${Date.now()}`, true, true);

        _toggleObfuscation(false);
        _verifyNames(contents);
    });

    it("should still be able to download files after toggling", () => {
        const contents = _createTestAccount(`obfuscation-test-user-${Date.now()}`, true, true);

        _toggleObfuscation(false);
        _verifyDownloads(contents);
    });
});

describe("Full Vault", () => {
    const USERNAME = `obfuscation-test-user-${Date.now()}`;
    let contents: VaultContents;

    before(() => {
        // Start with names that are not obfuscated
        contents = _createTestAccount(USERNAME, false);
    });

    beforeEach(() => {
        cy.login(SERVER_URL, USERNAME, "Password", false);
    });

    it("should keep names readable after enabling obfuscation", () => {
        _toggleObfuscation(true);
        _verifyNames(contents);
    });

    it("should keep names readable after disabling obfuscation", () => {
        _toggleObfuscation(false);
        _verifyNames(contents);
    });

    it("should keep names readable after enabling obfuscation again", () => {
        _toggleObfuscation(true);
        _verifyNames(contents);
    });

    it("should still be able to download the files", () => {
        // First time the files are downloaded, after having been renamed multiple times
        _verifyDownloads(contents);
    });
});

describe("Huge Vault", () => {
    const USERNAME = `obfuscation-test-user-${Date.now()}-huge`;
    const NUM_FILES = RENAME_PAGE_SIZE + 1; // One more than fits in a single request
    let fileNames: string[];

    // Only the first and last files are checked, since these are in different rename requests
    function _verifyEndFiles() {
        cy.get(`div[data-name='${fileNames[0]}']`).should("exist");
        cy.get(`div[data-name='${fileNames[NUM_FILES - 1]}']`).should("exist");
    }

    before(() => {
        cy.signup(SERVER_URL, USERNAME, "Password", true, false);

        // Wait for listener to connect
        cy.get("#directory-list-stats").should("exist");
        cy.get("#directory-list-stats ion-icon").should("have.attr", "aria-label", "Listener connected");

        // Upload enough files that renaming has to be split across multiple requests
        fileNames = createFile(new Array(NUM_FILES).fill(8), true);
        cy.get(`div[data-name='${fileNames[0]}']`, { timeout: 10000 }).should("exist");
        cy.get(`div[data-name='${fileNames[NUM_FILES - 1]}']`, { timeout: 10000 }).should("exist");
    });

    beforeEach(() => {
        cy.login(SERVER_URL, USERNAME, "Password", false);
    });

    it("should still work when disabling obfuscation", () => {
        _toggleObfuscation(false);
        _verifyEndFiles();
    });

    it("should still work when enabling obfuscation", () => {
        _toggleObfuscation(true);
        _verifyEndFiles();
    });
});
