describe("New User Page", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    it("should have basic elements", () => {
        cy.onboard(SERVER_URL);
        cy.visit("/new-user");

        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
        cy.get("[label='Username']").should("exist");
        cy.get("[label='Password']").should("exist");
        cy.get("[label='Confirm Password']").should("exist");
        cy.get("#ack-input input").should("have.length", 24);
    });

    it("should handle initial signup gracefully", () => {
        cy.signup(SERVER_URL, `new-test-user-${Date.now()}`, "Password123");
    });
});
