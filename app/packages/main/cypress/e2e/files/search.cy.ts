import { createFolder } from "./helpers";

// Helper functions
function _openSearch() {
    cy.get("#ellipsis-button").click();
    cy.get("ion-popover ion-item").contains("Search").click();
    cy.get("#search-modal").should("be.visible");
}

function _search(query: string) {
    cy.get("#search-modal ion-searchbar input")
        .focus() // Focus first, so that Cypress does not click on the (overlapping) close button
        .type("{selectAll}" + query, { delay: 0 }); // Type without delay to avoid 'typing' on the close button
}

// Tests
describe("Search Operations", () => {
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

    it("should find item by exact name", () => {
        const folderName = createFolder(`Searchable ${Date.now()}`);

        _openSearch();
        _search(folderName);
        cy.get(`#search-modal div[data-name='${folderName}']`).should("exist");
    });

    it("should find item despite typos", () => {
        const word = `Apple-${Date.now()}`;
        const folderName = createFolder(word);

        _openSearch();
        _search(word.replace("pp", "p")); // Drop a letter
        cy.get(`#search-modal div[data-name='${folderName}']`).should("exist");
    });

    it("should find nested item", () => {
        const superFolderName = createFolder();
        cy.get(`div[data-name='${superFolderName}']`).click();
        cy.wait(100); // Make sure navigation completes
        const nestedFolderName = createFolder(`Nested Searchable ${Date.now()}`);
        cy.get("#files-area").contains("(Go Back)").click();

        _openSearch();
        _search(nestedFolderName);
        cy.get(`#search-modal div[data-name='${nestedFolderName}']`).should("exist");
    });
});
