import { NFC_E_ACUTE, NFD_E_ACUTE, UNICODE_NAME } from "../constants";
import { createFolder, expectToast, itemSelector, renameItem, uploadFileNamed } from "../helpers";

const SERVER_URL = Cypress.expose("serverURL");
const NEAR_LIMIT_LENGTH = 2048 - 250; // 2048 is "standard" limit; 250 is arbitrary
const TOO_LONG_LENGTH = NEAR_LIMIT_LENGTH + 500;

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

describe("Invalid Names", () => {
    const invalidNames: [string, string][] = [
        ["", "Name cannot be empty"],
        [".", "Name cannot be '.'"],
        ["..", "Name cannot be '..'"],
        ["a/b", "Name cannot contain '/'"],
    ];

    invalidNames.forEach(([name, message]) => {
        it(`should reject creating a folder named '${name}'`, () => {
            createFolder(name, false);
            expectToast(message, "danger");
        });

        it(`should reject renaming to '${name}'`, () => {
            const folderName = createFolder();

            renameItem(folderName, name);
            expectToast(message, "danger");

            // Original item should be untouched
            cy.pullRefresh();
            cy.get(itemSelector(folderName)).should("exist");
        });
    });

    it("should skip uploading a file with an invalid name", () => {
        uploadFileNamed("..", true);
        expectToast("Skipping '..': Name cannot be '..'", "warning");

        cy.pullRefresh();
        cy.get(itemSelector("..")).should("not.exist");
    });
});

describe("Allowed Names", () => {
    const allowedNames = [
        `.hidden-${Date.now()}`,
        `trailing-dot-${Date.now()}.`,
        `double  space ${Date.now()}`,
        `it's "quoted" ${Date.now()}`,
    ];

    allowedNames.forEach((name) => {
        it(`should handle folder named '${name}'`, () => {
            createFolder(name);
            cy.get(itemSelector(name)).should("exist");
        });
    });

    it("should handle case-differing names in the same folder", () => {
        const base = `case-${Date.now()}`;
        createFolder(base);
        createFolder(base.toUpperCase());
        cy.get(itemSelector(base)).should("exist");
        cy.get(itemSelector(base.toUpperCase())).should("exist");
    });
});

describe("Unicode Names", () => {
    it("should handle folder with unicode name", () => {
        const folderName = `${UNICODE_NAME} ${Date.now()}`;
        createFolder(folderName);

        // Should come back from the server correctly in a new session
        cy.login(SERVER_URL, "test-user", "Password");
        cy.get(itemSelector(folderName)).should("exist");
    });

    it("should handle file with unicode name", () => {
        const fileName = `${UNICODE_NAME}-${Date.now()}.txt`;
        uploadFileNamed(fileName);

        // Should come back from the server correctly in a new session
        cy.login(SERVER_URL, "test-user", "Password");
        cy.get(itemSelector(fileName)).should("exist");
    });

    ["日本語のフォルダ", "مجلد", "😀🙂😎"].forEach((script) => {
        it(`should handle folder named '${script}'`, () => {
            const folderName = `${script} ${Date.now()}`;
            createFolder(folderName);
            cy.get(itemSelector(folderName)).should("exist");
        });
    });

    it("should treat differently-normalised names as the same name", () => {
        const suffix = Date.now();
        createFolder(`caf${NFC_E_ACUTE} ${suffix}`);

        // Same name, but with the accent as a separate combining character
        createFolder(`caf${NFD_E_ACUTE} ${suffix}`, false);
        expectToast("Folder already exists", "danger");
    });
});

describe("Name Length Limit", () => {
    it("should handle name just under the limit", () => {
        const folderName = `${Date.now()}-`.padEnd(NEAR_LIMIT_LENGTH, "a");
        createFolder(folderName);
        cy.get(itemSelector(folderName)).should("exist");
    });

    it("should reject folder name over the limit", () => {
        const folderName = `${Date.now()}-`.padEnd(TOO_LONG_LENGTH, "a");
        createFolder(folderName, false);
        expectToast("Failed to create folder: Name is too long", "danger");

        cy.pullRefresh();
        cy.get(itemSelector(folderName)).should("not.exist");
    });

    it("should reject renaming over the limit", () => {
        const folderName = createFolder();

        renameItem(folderName, `${Date.now()}-`.padEnd(TOO_LONG_LENGTH, "a"));
        expectToast("Failed to rename item: Name is too long", "danger");

        // Original item should be untouched
        cy.pullRefresh();
        cy.get(itemSelector(folderName)).should("exist");
    });

    it("should fail uploading a file name over the limit", () => {
        const fileName = `${Date.now()}-`.padEnd(TOO_LONG_LENGTH, "a") + ".txt";
        uploadFileNamed(fileName, true);

        // The job should have failed
        cy.contains("1 Failed").should("exist");

        cy.pullRefresh();
        cy.get(itemSelector(fileName)).should("not.exist");
    });

    it("should count the size of the encrypted name, not the characters", () => {
        // Far fewer characters than the ASCII case which works (600 vs. 1800), but many more bytes
        const folderName = `${Date.now()} - ${"🙂".repeat(600)}`;
        createFolder(folderName, false);
        expectToast("Failed to create folder: Name is too long", "danger");
    });
});
