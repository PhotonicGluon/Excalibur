import * as path from "path";

function randstr(n: number) {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const chars = [];

    for (let i = 0; i < n; i++) {
        chars.push(CHARS.charAt(Math.floor(Math.random() * CHARS.length)));
    }

    return chars.join("");
}

describe("Check Files Page Contents", () => {
    it("should redirect to server choice if not onboarded", () => {
        cy.visit("/files/");
        cy.url().should("include", "/server-choice");
    });

    it("should redirect to login if onboarded but not logged in", () => {
        cy.onboard("http://127.0.0.1:8989");
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should stay on files page if logged in", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");

        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
        cy.get('.breadcrumb-active > [slot=""]').should("exist");
    });
});

describe("Check File Page Operations", () => {
    const downloadsFolder = Cypress.config("downloadsFolder");

    // Helper functions
    function _createFolder() {
        // Clicking on create folder should have popup
        cy.get("ion-fab").eq(0).click(); // In case Cypress bugs out and detects multiple
        cy.get('[aria-label="Create Folder"]').click();
        cy.get(".alert-head").should("have.text", "Enter Folder Name");

        // Enter test folder name
        const folderName = `Test Folder ${Date.now()}`;
        cy.get(".alert-input-wrapper").click().wait(100); // For the focus to appear
        cy.get(".alert-input-wrapper").type(folderName);

        // Click confirm
        cy.get(".alert-button-group > :nth-child(2) > .alert-button-inner").click();
        cy.get(".alert-head").should("not.exist");

        // Folder should have been created
        cy.get(".h-16 > ion-grid.md").should("exist");
        cy.get(".h-16 > ion-grid.md").should("contain.text", folderName);

        return folderName;
    }

    function _createFile(n: number) {
        // Upload the test file
        const fileName = `test-file-${Date.now()}.txt`;
        const fileContent = Cypress.Buffer.from(randstr(n));
        cy.get("#main-content").selectFile({ contents: fileContent, fileName: fileName }, { action: "drag-drop" });

        // File should have been uploaded
        const fileElement = cy.get(`div[data-name='${fileName}']`);
        fileElement.should("exist");
        fileElement.should("contain.text", fileName);

        // Try downloading the file
        fileElement.click();
        cy.readFile(path.join(downloadsFolder, fileName)).should("exist");
    }

    // Tests
    it("should handle folder creation", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");

        _createFolder();
    });

    describe("file upload and download", () => {
        const SMALL_SIZE = 1024;
        const LARGE_SIZE = 1e6; // Enough for several chunking to occur

        beforeEach(() => {
            cy.login("http://127.0.0.1:8989", "test-user", "Password");
            cy.visit("/files/");
            cy.url().should("include", "/files");
        });

        it("should handle small file", () => {
            _createFile(SMALL_SIZE);
        });

        it("should handle large file", () => {
            _createFile(LARGE_SIZE);
        });
    });

    describe("nested operations", () => {
        beforeEach(() => {
            cy.login("http://127.0.0.1:8989", "test-user", "Password");
            cy.visit("/files/");
            cy.url().should("include", "/files");

            // Create super folder
            const superFolderName = _createFolder();
            const superFolder = cy.get(`div[data-name='${superFolderName}']`);
            superFolder.should("exist");
            superFolder.should("contain.text", superFolderName);

            // Go in
            superFolder.click();
            cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);
        });

        it("should create nested folder", () => {
            _createFolder();
        });

        it("should create nested file", () => {
            _createFile(1000);
        });
    });

    describe("breadcrumbs", () => {
        it("should handle single-nested folder", () => {
            cy.login("http://127.0.0.1:8989", "test-user", "Password");
            cy.visit("/files/");
            cy.url().should("include", "/files");

            // Create super folder
            const superFolderName = _createFolder();
            const superFolder = cy.get(`div[data-name='${superFolderName}']`);
            superFolder.should("exist");
            superFolder.should("contain.text", superFolderName);

            // Go in
            superFolder.click();
            cy.url().should("include", `/files/${encodeURIComponent(superFolderName)}`);

            // Check breadcrumbs
            cy.get("ion-breadcrumbs").should("exist");
            cy.get("ion-breadcrumb").eq(1).should("contain.text", superFolderName);
            cy.get("ion-breadcrumb").eq(0).click(); // Click on home
            cy.url().should("include", "/files");
            cy.get("ion-breadcrumbs").children().should("have.length", 1);
        });

        it("should handle multi-nested folder", () => {
            const NUM_NESTED_FOLDERS = 3;

            cy.login("http://127.0.0.1:8989", "test-user", "Password");
            cy.visit("/files/");
            cy.url().should("include", "/files");

            // Create folders
            let path = "/files";
            const folderNames = [];
            const folders = [];
            for (let i = 0; i < NUM_NESTED_FOLDERS; i++) {
                const aFolderName = _createFolder();
                const aFolder = cy.get(`div[data-name='${aFolderName}']`);
                aFolder.should("exist");

                folderNames.push(aFolderName);
                folders.push(aFolder);

                aFolder.click();
                path += `/${encodeURIComponent(aFolderName)}`;
                cy.url().should("include", path);
            }

            // Check breadcrumb names
            cy.get("ion-breadcrumbs").should("exist");
            for (let i = NUM_NESTED_FOLDERS - 1; i >= 0; i--) {
                cy.get("ion-breadcrumb")
                    .eq(i + 1)
                    .should("contain.text", folderNames[i]);
            }

            // Check breadcrumb redirections
            for (let i = NUM_NESTED_FOLDERS - 1; i >= 0; i--) {
                cy.get("ion-breadcrumb").eq(i).click();
                let expectedPath = "/files";
                for (let j = 0; j < i; j++) {
                    expectedPath += `/${encodeURIComponent(folderNames[j])}`;
                }
                cy.url().should("include", expectedPath);
                cy.get("ion-breadcrumbs")
                    .children()
                    .should("have.length", i + 1);
            }
        });
    });
});
