describe("Check Login Page Contents", () => {
    it("index redirects to login", () => {
        cy.visit("/");
        cy.url().should("include", "/login");
    });

    it("should have basic navigation", () => {
        cy.visit("/login");

        cy.get(".ion-padding-top > .ion-color").should("exist"); // Settings button
    });

    it("should have login form", () => {
        cy.visit("/login");

        cy.get("#server-input").should("exist");
        cy.get("#password-input").should("exist");
        cy.get("#save-password-checkbox").should("exist");
        cy.get("#login-button").should("exist");
    });
});
