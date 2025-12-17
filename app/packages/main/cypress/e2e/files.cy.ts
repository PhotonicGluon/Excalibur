import * as path from "path";

const SMALL_SIZE = 1024;
const LARGE_SIZE = 1e6; // Enough for several chunking to occur

function randstr(n: number) {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const chars = [];

    for (let i = 0; i < n; i++) {
        chars.push(CHARS.charAt(Math.floor(Math.random() * CHARS.length)));
    }

    return chars.join("");
}

describe("Check Page Contents", () => {
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

describe("Check Page Operations", () => {
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

        // Click create
        cy.get(".alert-button-group").contains("Create").click();
        cy.get(".alert-head").should("not.exist");

        // Folder should have been created
        cy.get(".h-16 > ion-grid.md").should("exist");
        cy.get(".h-16 > ion-grid.md").should("contain.text", folderName);

        return folderName;
    }

    function _createFile(n: number | number[], dropOnly?: boolean): string[] {
        if (!Array.isArray(n)) {
            n = [n];
        }

        // Upload the test file
        const fileNames = [];
        const fileContents = [];
        const selectFileList = [];

        const nameBase = `test-file-${Date.now()}`;
        for (let i = 0; i < n.length; i++) {
            const fileName = `${nameBase}-${i}.txt`;
            const fileContent = Cypress.Buffer.from(randstr(n[i]));
            fileNames.push(fileName);
            fileContents.push(fileContent);
            selectFileList.push({ contents: fileContent, fileName: fileName });
        }
        cy.get("#files-area").selectFile(selectFileList, { action: "drag-drop" });

        if (dropOnly) {
            return fileNames;
        }

        // File(s) should have been uploaded
        const fileElements = [];
        for (let i = 0; i < n.length; i++) {
            const fileElement = cy.get(`div[data-name='${fileNames[i]}']`);
            fileElements.push(fileElement);

            fileElement.should("exist");
            fileElement.should("contain.text", fileNames[i]);
        }

        // Try downloading the files
        for (let i = 0; i < n.length; i++) {
            fileElements[i].click(); // Trigger all downloads first
        }
        for (let i = 0; i < n.length; i++) {
            cy.readFile(path.join(downloadsFolder, fileNames[i])).should("exist"); // Then check file existence
        }

        return fileNames;
    }

    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");
    });

    // Tests
    it("should handle folder creation", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");

        _createFolder();
    });

    describe("single-file upload and download", () => {
        it("should handle small file", () => {
            _createFile(SMALL_SIZE);
        });

        it("should handle large file", () => {
            _createFile(LARGE_SIZE);
        });
    });

    describe("multi-file upload and download", () => {
        it("should handle small files", () => {
            _createFile([SMALL_SIZE, SMALL_SIZE, SMALL_SIZE]);
        });

        it("should handle large files", () => {
            _createFile([LARGE_SIZE, LARGE_SIZE, LARGE_SIZE]);
        });
    });

    it("should move items", () => {
        // Create test file and folder
        const fileName = _createFile(SMALL_SIZE, true)[0];
        const folderName = _createFolder();

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

    describe("nested operations", () => {
        beforeEach(() => {
            // Create super folder
            const superFolderName = _createFolder();
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
            _createFolder();
        });

        it("should create nested file", () => {
            _createFile(1000);
        });
    });

    describe("cancellations", () => {
        it("should handle upload cancellations", () => {
            // Create a file upload task
            const fileName = _createFile(1e6, true)[0];

            // Check that the job is listed
            cy.get("#jobs-summary").click();
            cy.get("#jobs-popover").should("exist");
            cy.get("#jobs-popover").should("not.have.text", "No active jobs");

            const jobEntry = cy.get(".grid");
            jobEntry.should("contain.text", fileName);

            // Cancel the job
            jobEntry.get(".circular-progress-bar").parent().click();

            cy.get("#jobs-popover").should("have.text", "No active jobs");
            cy.get(`div[data-name='${fileName}']`).should("not.exist");
        });

        it("should handle download cancellations", () => {
            // Upload a file
            const fileName = _createFile(1e6, true)[0];
            const fileElement = cy.get(`div[data-name='${fileName}']`);
            fileElement.should("exist");

            // Create a file download task
            fileElement.click();

            // Check that the job is listed
            cy.get("#jobs-summary").click();
            cy.get("#jobs-popover").should("exist");
            cy.get("#jobs-popover").should("not.have.text", "No active jobs");

            const jobEntry = cy.get(".grid");
            jobEntry.should("contain.text", fileName);

            // Cancel the job
            jobEntry.get(".circular-progress-bar").parent().click();

            cy.get("#jobs-popover").should("have.text", "No active jobs");
            cy.readFile(path.join(downloadsFolder, fileName)).should("not.exist");
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
