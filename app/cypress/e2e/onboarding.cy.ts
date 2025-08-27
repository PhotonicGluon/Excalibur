describe("Check Welcome Page", () => {
    it("initial visit to index should redirect to welcome", () => {
        cy.visit("/");
        cy.url().should("include", "/welcome");
    });

    it("after welcome should be server choice", () => {
        cy.visit("/welcome");
        cy.get("#continue-button").click();
        cy.url().should("include", "/server-choice");
    });

    it("after welcome, visit to index should redirect to server choice", () => {
        cy.visit("/welcome");
        cy.get("#continue-button").click();
        cy.url().should("include", "/server-choice");

        // Visit index and check if it redirects to server choice
        cy.visit("/");
        cy.url().should("include", "/server-choice");
    });
});

describe("Check Server Choice Page", () => {
    it("should have required elements", () => {
        cy.visit("/server-choice");

        cy.get("#settings-button").should("exist");
        cy.get("#server-input").should("exist");
        cy.get("#confirm-button").should("exist");
    });

    it("settings should open settings page", () => {
        cy.visit("/server-choice");
        cy.get("#settings-button").click();
        cy.url().should("include", "/settings");
    });

    describe("Check URL Validation", () => {
        const invalidURLs = ["http://", "https://", "invalid-url", "invalid-url/", "invalid-url/invalid-path"];
        for (const url of invalidURLs) {
            it(`should reject '${url}'`, () => {
                cy.visit("/server-choice");
                cy.get("#server-input").type(url);
                cy.get("#confirm-button").click();
                cy.get(".alert-head").should("exist");
                cy.get(".alert-head").should("have.text", "Invalid URL");
            });
        }
    });

    it("should handle valid URL", () => {
        cy.visit("/server-choice");
        cy.get("#server-input").type("http://127.0.0.1:8989");
        cy.get("#confirm-button").click();
        cy.url().should("include", "/login");
    });
});
