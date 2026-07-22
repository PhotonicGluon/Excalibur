import * as path from "path";

export const DOWNLOADS_FOLDER = Cypress.config("downloadsFolder");

function randstr(n: number) {
    const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const chars = [];

    for (let i = 0; i < n; i++) {
        chars.push(CHARS.charAt(Math.floor(Math.random() * CHARS.length)));
    }

    return chars.join("");
}

export function createFolder() {
    // Clicking on create folder should have popup
    cy.get("ion-fab").eq(0).click(); // In case Cypress bugs out and detects multiple
    cy.get("#fab-create-folder").click();
    cy.get(".alert-head").should("have.text", "Enter Folder Name");

    // Enter test folder name
    const folderName = `Test Folder ${Date.now()}`;
    cy.get(".alert-input-wrapper").find("input").click().wait(100); // For the focus to appear
    cy.get(".alert-input-wrapper").find("input").type(folderName);

    // Click create
    cy.get(".alert-button-group").contains("Create").click();
    cy.get(".alert-head").should("not.exist");

    cy.pullRefresh();

    // Folder should have been created
    cy.get(".h-16 > ion-grid.md").should("exist");
    cy.get(".h-16 > ion-grid.md").should("contain.text", folderName);

    // Wait for the "Folder created" toast to clear so later toast assertions cannot match it
    cy.get("ion-toast", { timeout: 10000 }).should("not.exist");

    return folderName;
}

export function createFile(n: number | number[], dropOnly?: boolean): string[] {
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
    cy.get("#files-area").selectFile(selectFileList, { action: "drag-drop" }).wait(100);

    if (dropOnly) {
        return fileNames;
    }

    cy.pullRefresh();

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
        cy.get(`div[data-name='${fileNames[i]}']`).click();
    }
    for (let i = 0; i < n.length; i++) {
        cy.readFile(path.join(DOWNLOADS_FOLDER, fileNames[i])).should("exist"); // Then check file existence
    }

    return fileNames;
}
