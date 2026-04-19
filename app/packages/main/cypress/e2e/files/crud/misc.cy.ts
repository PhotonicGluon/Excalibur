import { createFolder } from "../helpers";

describe("Miscellaneous Operations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");
    });

    it("should handle folder creation", () => {
        createFolder();
    });
});
