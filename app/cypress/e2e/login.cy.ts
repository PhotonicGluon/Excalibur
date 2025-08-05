describe("Check Login Page Contents", () => {
    beforeEach(() => {
        cy.visit("/login");
    });

    it("index redirects to login", () => {
        cy.visit("/");
        cy.url().should("include", "/login");
    });

    it("should have basic navigation", () => {
        cy.get(".ion-padding-top > .ion-color").should("exist"); // Settings button
    });

    it("should have login form", () => {
        cy.get("#server-input").should("exist");
        cy.get("#password-input").should("exist");
        cy.get("#save-password-checkbox").should("exist");
        cy.get("#login-button").should("exist");
    });
});

describe("Handle Auth Process", () => {
    it("should handle initial signup gracefully", () => {
        cy.exec("cd .. && npm run server:re-init-for-test");
        cy.visit("/login");

        // Fill in login form
        cy.get("#server-input > .input-wrapper").type("http://127.0.0.1:8989");
        cy.get("#password-input > .input-wrapper").type("Password");
        cy.get("#login-button").click();

        // Assert that the setup confirmation dialog shows up
        cy.get(".alert-head").should("exist");
        cy.get(".alert-head").should("have.text", "Security Details Not Set Up");

        // Set up details and try logging in again
        cy.get(".alert-button-role-confirm").click();
        cy.get(".alert-head").should("not.exist");

        cy.get("#login-button").click();
        cy.url().should("include", "/files");
    });

    it("should handle login gracefully", () => {
        cy.login("http://127.0.0.1:8989", "Password");
    });
});
