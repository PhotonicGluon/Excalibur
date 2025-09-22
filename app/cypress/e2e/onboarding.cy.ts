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

    describe("Query correct URLs when entering server URLs", () => {
        beforeEach(() => cy.visit("/server-choice"));

        it("has port", () => {
            // Intercept request to check validity
            cy.intercept("GET", "http://example:11111/api/well-known/version", { forceNetworkError: true }).as("check");

            // Make the request
            cy.get("#server-input").type("http://example:11111");
            cy.get("#confirm-button").click();

            cy.get("@check").should("exist");
        });

        it("has no port", () => {
            // Intercept requests to check validity
            cy.intercept("GET", "http://example:52419/api/well-known/version", { forceNetworkError: true }).as(
                "check_default",
            );
            cy.intercept("GET", "http://example/api/well-known/version", { forceNetworkError: true }).as(
                "check_no_port",
            );

            // Make the request
            cy.get("#server-input").type("http://example");
            cy.get("#confirm-button").click();

            cy.get("@check_default").should("exist");
            cy.get("@check_no_port").should("exist");
        });
    });

    it("should handle valid URL", () => {
        cy.visit("/server-choice");
        cy.get("#server-input").type("http://127.0.0.1:8989");
        cy.get("#confirm-button").click();
        cy.url().should("include", "/login");
    });
});
