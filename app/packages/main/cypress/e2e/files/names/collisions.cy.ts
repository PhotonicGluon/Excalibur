import { SMALL_SIZE } from "../constants";
import { createFolder, expectToast, itemSelector, renameItem, uploadFileNamed } from "../helpers";

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

// Helper functions
function _moveItemInto(itemName: string, destFolderName: string) {
    cy.get(itemSelector(itemName)).scrollIntoView(); // Make sure its visible
    cy.wait(100); // Make sure scroll completes
    cy.get(itemSelector(itemName)).rightclick();
    cy.get(".item").contains("Move").click();
    cy.get(`#move-modal ${itemSelector(destFolderName)}`).click();
    cy.get("#move-modal-confirm").click();
}

// Tests
describe("Folder Name Collisions", () => {
    it("should reject duplicate folder in the same folder", () => {
        const folderName = createFolder();

        cy.get("ion-toast", { timeout: 10000 }).should("not.exist");
        cy.get("ion-fab").eq(0).click();
        cy.get("#fab-create-folder").click();
        cy.get(".alert-input-wrapper").find("input").click().wait(100); // For the focus to appear
        cy.get(".alert-input-wrapper").find("input").type(folderName);
        cy.get(".alert-button-group").contains("Create").click();

        expectToast("Folder already exists", "danger");
        cy.get(itemSelector(folderName)).should("have.length", 1);
    });

    it("should allow the same name in different folders", () => {
        const name = createFolder();
        const parentName = createFolder();

        cy.get(itemSelector(parentName)).click();
        cy.wait(100); // Make sure navigation completes
        createFolder(name);
        cy.get(itemSelector(name)).should("exist");

        // The one in the root folder should be unaffected
        cy.get("#files-area").contains("(Go Back)").click();
        cy.get(itemSelector(name)).should("exist");
    });

    it("should reject renaming onto a sibling's name", () => {
        const firstName = createFolder();
        const secondName = createFolder();

        renameItem(firstName, secondName);
        expectToast("Failed to rename item: Item with that name already exists", "danger");

        // Both items should be unchanged
        cy.pullRefresh();
        cy.get(itemSelector(firstName)).should("have.length", 1);
        cy.get(itemSelector(secondName)).should("have.length", 1);
    });

    it("should reject moving into a folder that has the same name", () => {
        const name = createFolder();
        const destName = createFolder();

        // Put an item with the same name in the destination
        cy.get(itemSelector(destName)).click();
        cy.wait(100); // Make sure navigation completes
        createFolder(name);
        cy.get("#files-area").contains("(Go Back)").click();
        cy.get("ion-breadcrumbs").children().should("have.length", 1); // Wait for the navigation to complete
        cy.get(itemSelector(name)).should("have.length", 1);

        _moveItemInto(name, destName);
        expectToast("Failed to move item: Item with name already exists at destination", "danger");
        cy.get("#move-modal-close").click();

        // The item should still be where it was
        cy.pullRefresh();
        cy.get(itemSelector(name)).should("exist");
    });

    it("should free the old name after moving", () => {
        const name = createFolder();
        const destName = createFolder();

        _moveItemInto(name, destName);
        cy.get("#move-modal").should("not.be.visible");
        cy.get(itemSelector(name)).should("not.exist");

        // The name should be usable again in the old folder
        createFolder(name);
        cy.get(itemSelector(name)).should("exist");

        // And the moved item should still be in the destination
        cy.get(itemSelector(destName)).click();
        cy.get(itemSelector(name)).should("exist");
    });
});

describe("File Upload Collisions", () => {
    let fileName: string;
    let originalText: string;

    beforeEach(() => {
        // Upload a file, then upload a bigger one with the same name
        fileName = `collision-${Date.now()}.txt`;
        uploadFileNamed(fileName);
        cy.get(itemSelector(fileName))
            .invoke("text")
            .then((text) => {
                originalText = text;
            });

        uploadFileNamed(fileName, true, SMALL_SIZE);
        cy.get(".alert-head").should("have.text", `${fileName} already exists`);
    });

    it("should leave the file alone when skipping", () => {
        cy.get(".alert-button-group").contains("Skip This File").click();
        cy.get(".alert-head").should("not.exist");

        cy.wait(500); // Give a wrongly-started upload some time to finish
        cy.pullRefresh();
        cy.get(itemSelector(fileName)).should(($item) => {
            expect($item.text()).to.equal(originalText);
        });
    });

    it("should replace the file when overriding", () => {
        cy.get(".alert-button-group").contains("Override This File").click();
        cy.get(".alert-head").should("not.exist");

        cy.pullRefresh();
        cy.get(itemSelector(fileName)).should(($item) => {
            expect($item.text()).not.to.equal(originalText);
        });
        cy.get(itemSelector(fileName)).should("have.length", 1);
    });

    it("should cancel the upload when aborting", () => {
        cy.get(".alert-button-group").contains("Abort Upload").click();
        expectToast("File upload cancelled", "warning");

        cy.pullRefresh();
        cy.get(itemSelector(fileName)).should(($item) => {
            expect($item.text()).to.equal(originalText);
        });
    });
});
