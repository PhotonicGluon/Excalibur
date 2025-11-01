let ack: string[];
before(() => {
    // Retrieve Account Creation Key (ACK) from server running on debug mode
    cy.request({
        url: "http://127.0.0.1:8989/api/auth/ack",
        method: "GET",
    }).then((response) => {
        const mnemonic = response.body;
        assert(mnemonic.length === 24);
        ack = mnemonic;
    });
});

beforeEach(() => {
    cy.onboard("http://127.0.0.1:8989");
    cy.visit("/new-user");
});

describe("New User Page", () => {
    it("should have basic navigation", () => {
        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
    });

    it("should have signup form", () => {
        cy.get("#new-username-input").should("exist");
        cy.get("#new-password-input").should("exist");
        for (let i = 0; i < 24; i++) {
            cy.get(`input[placeholder="Word ${i + 1}"]`).should("exist");
        }
    });

    it("should handle initial signup gracefully", () => {
        // Initial checks
        cy.get("#vault-key-modal").should("not.be.visible");

        // Fill in signup form
        const username = `new-test-user-${Date.now()}`;
        cy.get("#new-username-input").find("input").type(username);
        cy.get("#new-password-input").find("input").type("Password123");

        // Fill in Account Creation Key (ACK)
        const ackInput = cy.get("#ack-input");
        ackInput.find("input").each(($el, index) => {
            const el = cy.wrap($el);
            el.type(ack[index]);
            el.blur();
        });

        // Confirm
        cy.get("div > div > ion-button").click();

        // Assert that the vault key dialog shows up
        cy.get("#vault-key-modal").should("be.visible");
        cy.get("#vault-key-modal-close").click();

        // We should have been redirected to the login page
        cy.url().should("include", "/login");

        // Now try to log in again
        cy.get("#username-input").find("input").type(username);
        cy.get("#password-input").find("input").type("Password123");
        cy.get("#login-button").click();
        cy.url().should("include", "/files");
    });
});
