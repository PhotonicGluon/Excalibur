describe("Check Settings Page Contents", () => {
    beforeEach(() => {
        cy.visit("/settings");
    });

    it("should have basic navigation", () => {
        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
    });

    it("should have settings submenus", () => {
        cy.get("#settings-interface").should("exist");
        cy.get("#settings-crypto").should("exist");
        cy.get("#settings-update").should("exist");
    });
});

describe("Check Theme Changing", () => {
    beforeEach(() => {
        cy.visit("/settings/interface");
    });

    it("changing to light theme should disable dark mode", () => {
        cy.get(".ion-padding-horizontal > :nth-child(1) > :nth-child(2)").click();
        cy.get("ion-select-popover ion-item").first().next().click(); // Light mode
        cy.get("html").should("not.have.class", "ion-palette-dark");
    });

    it("changing to dark theme should enable dark mode", () => {
        cy.get(".ion-padding-horizontal > :nth-child(1) > :nth-child(2)").click();
        cy.get("ion-select-popover ion-item").first().next().next().click(); // Dark mode
        cy.get("html").should("have.class", "ion-palette-dark");
    });
});
