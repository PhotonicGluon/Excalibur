describe("Check Welcome Page", () => {
    it("initial visit to index should redirect to welcome", () => {
        cy.visit("/");
        cy.url().should("include", "/welcome");
    });

    it("completing welcome flow redirects to server choice", () => {
        cy.visit("/welcome");
        cy.get("#continue-button").click();
        cy.url().should("include", "/server-choice");
    });

    it("persists welcome completion state", () => {
        // Complete welcome
        cy.visit("/welcome");
        cy.get("#continue-button").click();

        // Go back to root, expecting redirection to server-choice (skipping welcome)
        cy.visit("/");
        cy.url().should("include", "/server-choice");
    });
});

describe("Check Server Choice Page", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    beforeEach(() => {
        cy.visit("/server-choice");
    });

    it("should have required elements", () => {
        cy.get("#settings-button").should("exist");
        cy.get("#server-input").should("exist");
        cy.get("#confirm-button").should("exist");
    });

    it("settings button should navigate correctly", () => {
        cy.get("#settings-button").click();
        cy.url().should("include", "/settings");
    });

    describe("Check URL Validation", () => {
        const invalidURLs = ["http://", "https://", "invalid-url", "invalid-url/path"];

        invalidURLs.forEach((url) => {
            it(`should reject invalid URL: '${url}'`, () => {
                cy.get("#server-input").type(url);
                cy.get("#confirm-button").click();

                // Ionic alerts usually have a specific header class
                cy.get("ion-alert .alert-head").should("contain.text", "Invalid URL");

                // Dismiss alert to clean up state for next test if necessary
                cy.get(".alert-button").click();
            });
        });
    });

    describe("Network Query Logic", () => {
        it("should query exact port if provided", () => {
            // Intercept request to check validity
            cy.intercept("GET", "http://example:11111/api/well-known/version", { forceNetworkError: true }).as(
                "checkPort",
            );

            cy.get("#server-input").type("http://example:11111");
            cy.get("#confirm-button").click();

            // Explicitly wait for the network call to happen
            cy.wait("@checkPort");
        });

        it("should fallback to default ports if no port provided", () => {
            // It tries port 52419 (default) and standard port 80/443
            cy.intercept("GET", "http://example:52419/api/well-known/version", { forceNetworkError: true }).as(
                "checkDefault",
            );
            cy.intercept("GET", "http://example/api/well-known/version", { forceNetworkError: true }).as(
                "checkStandard",
            );

            cy.get("#server-input").type("http://example");
            cy.get("#confirm-button").click();

            // Cypress waits for these to fire
            cy.wait(["@checkDefault", "@checkStandard"]);
        });
    });

    it("should handle valid URL and redirect to login", () => {
        cy.get("#server-input").type(SERVER_URL);
        cy.get("#confirm-button").click();
        cy.url().should("include", "/login");
    });
});
