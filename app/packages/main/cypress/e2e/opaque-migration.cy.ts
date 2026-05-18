const USERNAME = "test-user-srp";
const PASSWORD = "Password";

describe("Migration from SRP to OPAQUE", () => {
    function _login() {
        cy.visit("/login");

        // Login using form
        cy.get("#username-input").type("{selectAll}" + USERNAME);
        cy.get("#password-input").type("{selectAll}" + PASSWORD);
        cy.get("#login-button").click();
    }

    beforeEach(() => {
        cy.onboard(Cypress.expose("serverURL"));
        _login();
        cy.get(".alert-wrapper > .alert-head").contains("Upgrade to OPAQUE"); // Prompt to upgrade to OPAQUE
    });

    afterEach(function () {
        // Stop other tests if any test fails
        if (this.currentTest.state === "failed") {
            Cypress.stop();
            return;
        }
    });

    it("should not upgrade SRP user to OPAQUE if not selected", () => {
        cy.get(".alert-wrapper > .alert-button-group > .alert-button").contains("No").click();
        cy.get(".alert-wrapper").should("not.exist");
        cy.url().should("include", "/files"); // Should still successfully log in

        // Trying to log in again will re-prompt the upgrade
        _login();
        cy.get(".alert-wrapper > .alert-head").contains("Upgrade to OPAQUE");
    });

    it("should upgrade SRP user to OPAQUE if selected", () => {
        cy.get(".alert-wrapper > .alert-button-group > .alert-button").contains("Yes").click();
        cy.get(".alert-wrapper").should("not.exist");
        cy.url().should("include", "/files"); // Should successfully log in

        // Trying to log in again will re-prompt the upgrade
        _login();
        cy.url().should("include", "/files"); // Should directly go to files
    });
});
