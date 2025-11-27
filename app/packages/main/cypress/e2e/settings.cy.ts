beforeEach(() => {
    cy.visit("/settings");
});

describe("Check Settings Page Contents", () => {
    it("should have basic navigation", () => {
        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
    });

    it("should have settings form", () => {
        cy.get("#theme").should("exist");
        cy.get("#row-alternating-colours").should("exist");
        cy.get("#file-size-units").should("exist");
        cy.get("#crypto-chunk-size").should("exist");

        cy.get(".content-ltr > .button").should("exist");
    });

    it("changing setting should enable button", () => {
        cy.get(".content-ltr > .button").should("have.attr", "disabled");

        cy.get("#theme").click();
        cy.get("ion-select-popover ion-item ").first().next().click(); // Switch to light mode
        cy.get(".content-ltr > .button").should("not.have.attr", "disabled");
    });

    it("changing setting and then saving it should disable button", () => {
        cy.get(".content-ltr > .button").should("have.attr", "disabled");

        cy.get("#theme").click();
        cy.get("ion-select-popover ion-item ").first().next().click(); // Switch to light mode
        cy.get(".content-ltr > .button").should("not.have.attr", "disabled");

        cy.get(".content-ltr > .button").click();
        cy.get(".content-ltr > .button").should("have.attr", "disabled");
    });
});

describe("Check Theme Changing", () => {
    it("changing to light theme should disable dark mode", () => {
        cy.get("#theme").click();
        cy.get("ion-select-popover ion-item").first().next().click(); // Light mode
        cy.get("html").should("not.have.class", "ion-palette-dark");
    });

    it("changing to dark theme should enable dark mode", () => {
        cy.get("#theme").click();
        cy.get("ion-select-popover ion-item").first().next().next().click(); // Dark mode
        cy.get("html").should("have.class", "ion-palette-dark");
    });
});
