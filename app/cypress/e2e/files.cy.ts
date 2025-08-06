describe("Check Files Page Contents", () => {
    it("should redirect to index if not logged in", () => {
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should work after logging in", () => {
        cy.login("http://127.0.0.1:8989", "Password");
        cy.visit("/files/");
        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
    });
});
