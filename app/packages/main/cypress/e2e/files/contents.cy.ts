describe("Check Page Contents", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    it("should redirect to server choice if not onboarded", () => {
        cy.visit("/files/");
        cy.url().should("include", "/server-choice");
    });

    it("should redirect to login if onboarded but not logged in", () => {
        cy.onboard(SERVER_URL);
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should redirect to login on reload", () => {
        cy.signup(SERVER_URL, "test-user", "Password", false, false);
        cy.login(SERVER_URL, "test-user", "Password");
        cy.reload();
        cy.url().should("include", "/login");
    });

    it("should stay on files page if logged in", () => {
        cy.signup(SERVER_URL, "test-user", "Password", false, false);
        cy.login(SERVER_URL, "test-user", "Password");

        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
        cy.get('.breadcrumb-active > [slot=""]').should("exist");
    });
});
