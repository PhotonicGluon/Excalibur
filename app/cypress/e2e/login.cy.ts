describe("Check Login Page Contents", () => {
    beforeEach(() => {
        cy.onboard("http://127.0.0.1:8989");
        cy.visit("/login");
    });

    it("should have basic navigation", () => {
        cy.get("#menu-button").should("exist");
    });

    it("should have login form", () => {
        cy.get("#username-input").should("exist");
        cy.get("#password-input").should("exist");
        cy.get("#save-password-checkbox").should("exist");
        cy.get("#login-button").should("exist");
    });
});

describe("Handle Auth Process", () => {
    beforeEach(() => {
        cy.onboard("http://127.0.0.1:8989");
    });

    it("should handle initial signup gracefully", () => {
        cy.visit("/login");

        // Initial checks
        cy.get("#vault-key-modal").should("not.exist");

        // Fill in login form
        cy.get("#username-input > .input-wrapper").type(`new-test-user-${Date.now()}`);
        cy.get("#password-input > .input-wrapper").type("Password123");
        cy.get("#login-button").click();

        // Assert that the setup confirmation dialog shows up
        cy.get(".alert-head").should("exist");
        cy.get(".alert-head").should("have.text", "Security Details Not Set Up");

        // Set up details
        cy.get(".alert-button-role-confirm").click();
        cy.get(".alert-head").should("not.exist");

        // Assert that the vault key dialog shows up
        cy.get("#vault-key-modal").should("exist");
        cy.get("#vault-key-modal-close").click();

        // Now try to log in again
        cy.get("#login-button").click();
        cy.url().should("include", "/files");
    });

    it("should handle login gracefully", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("not.include", "/login");
    });
});

describe("Check All Inputs Filled", () => {
    beforeEach(() => {
        cy.onboard("http://127.0.0.1:8989");
        cy.visit("/login");
    });

    ["username-input", "password-input"].forEach((input) => {
        it(`should check if ${input} is filled`, () => {
            cy.get(`#${input}`).type("some-text");
            cy.get("#login-button").click();
            cy.get(".alert-head").should("exist");
            cy.get(".alert-head").should("have.text", "Invalid Values");
        });
    });
});
