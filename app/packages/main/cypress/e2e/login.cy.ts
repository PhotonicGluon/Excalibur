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

    it("should have working new user link", () => {
        cy.get("#new-user-link").should("exist");
        cy.get("#new-user-link").click();
        cy.url().should("include", "/new-user");
    });
});

describe("Handle Auth Process", () => {
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
