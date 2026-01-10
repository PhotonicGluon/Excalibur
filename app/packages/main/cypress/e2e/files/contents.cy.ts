describe("Check Page Contents", () => {
    it("should redirect to server choice if not onboarded", () => {
        cy.visit("/files/");
        cy.url().should("include", "/server-choice");
    });

    it("should redirect to login if onboarded but not logged in", () => {
        cy.onboard("http://127.0.0.1:8989");
        cy.visit("/files/");
        cy.url().should("include", "/login");
    });

    it("should stay on files page if logged in", () => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");

        cy.get(".fab-horizontal-end").should("exist"); // The "add" fab should exist
        cy.get('.breadcrumb-active > [slot=""]').should("exist");
    });
});
