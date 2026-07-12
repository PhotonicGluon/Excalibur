import { createFolder } from "../helpers";

describe("Miscellaneous Operations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should handle folder creation", () => {
        createFolder();
    });
});
