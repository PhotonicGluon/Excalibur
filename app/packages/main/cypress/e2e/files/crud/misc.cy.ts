import { createFolder } from "../helpers";

const SERVER_URL = Cypress.expose("serverURL");

describe("Miscellaneous Operations", () => {
    beforeEach(() => {
        cy.signup(SERVER_URL, "test-user", "Password", false, false);
        cy.login(SERVER_URL, "test-user", "Password");
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest?.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should handle folder creation", () => {
        createFolder();
    });
});
