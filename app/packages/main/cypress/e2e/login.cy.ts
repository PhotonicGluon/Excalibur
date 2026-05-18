describe("Check Login Page Contents", () => {
    beforeEach(() => {
        cy.onboard(Cypress.expose("serverURL"));
        cy.visit("/login");
    });

    it("should have basic navigation and form", () => {
        cy.get("#menu-button").should("exist");
        cy.get("#username-input").should("exist");
        cy.get("#password-input").should("exist");
        cy.get("#save-password-checkbox").should("exist");
        cy.get("#login-button").should("exist");
    });

    it("should navigate to new user page", () => {
        cy.get("#new-user-link").click();
        cy.url().should("include", "/new-user");
    });
});

describe("Handle Auth Process", () => {
    it("should handle login gracefully", () => {
        cy.login(Cypress.expose("serverURL"), "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("not.include", "/login");
    });

    describe("Handle Incorrect Credentials", () => {
        beforeEach(() => {
            cy.onboard(Cypress.expose("serverURL"));
            cy.visit("/login");
        });

        it("should show error if user does not exist", () => {
            cy.get("#username-input").type("{selectAll}" + "non-existent-user");
            cy.get("#password-input").type("{selectAll}" + "Password");
            cy.get("#login-button").click();

            cy.url().should("include", "/login"); // Did not move into files page
            cy.get(".alert-wrapper").should("be.visible");
            cy.get(".alert-title").should("contain.text", "User Not Found");
        });

        it("should show error if password is incorrect", () => {
            cy.get("#username-input").type("{selectAll}" + "test-user");
            cy.get("#password-input").type("{selectAll}" + "WrongPassword");
            cy.get("#login-button").click();

            cy.url().should("include", "/login"); // Did not move into files page
            cy.get(".alert-wrapper").should("be.visible");
            cy.get(".alert-title").should("contain.text", "Authentication Failed");
        });
    });
});

describe("Check All Inputs Filled", () => {
    beforeEach(() => {
        cy.onboard(Cypress.expose("serverURL"));
        cy.visit("/login");
    });

    const inputs = [
        { field: "#username-input", name: "username" },
        { field: "#password-input", name: "password" },
    ];

    inputs.forEach((input) => {
        it(`should show error if ${input.name} is missing`, () => {
            // Fill the *other* inputs, but leave current one empty
            inputs
                .filter((i) => i.field !== input.field)
                .forEach((other) => {
                    cy.get(other.field).type("some-value");
                });

            cy.get("#login-button").click();

            cy.get("ion-alert .alert-head").should("be.visible").and("contain.text", "Invalid Values");

            // Close alert
            cy.get(".alert-button").click();
        });
    });
});
