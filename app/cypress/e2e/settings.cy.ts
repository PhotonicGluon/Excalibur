describe("Check Settings Page Contents", () => {
    it("does not redirect to login", () => {
        cy.visit("/settings");
        cy.url().should("include", "/settings");
    });

    it("should have basic navigation", () => {
        cy.visit("/settings");

        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
    });

    it("should have settings form", () => {
        cy.visit("/settings");

        cy.get("#theme").should("exist");
        cy.get("#row-alternating-colours").should("exist");
        cy.get("#file-size-units").should("exist");
        cy.get("#crypto-chunk-size").should("exist");

        cy.get(".content-ltr > .button").should("exist");
    });

    it("changing setting should enable button", () => {
        cy.visit("/settings");

        cy.get(".content-ltr > .button").should("have.attr", "disabled");

        cy.get("#theme").click();
        cy.get("ion-select-popover ion-item ").first().next().click();
        cy.get(".content-ltr > .button").should("not.have.attr", "disabled");
    });
});
