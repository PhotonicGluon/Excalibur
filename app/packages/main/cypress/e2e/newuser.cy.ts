let ack: string[];
describe("New User Page", () => {
    const SERVER_URL = Cypress.env("serverURL");

    before(() => {
        // Fetch ACK once before tests start and wrap it as an alias
        cy.request({
            url: `${SERVER_URL}/api/auth/ack`,
            method: "GET",
        }).then((response) => {
            expect(response.body).to.have.length(24);
            ack = response.body;
        });
    });

    beforeEach(() => {
        cy.onboard(SERVER_URL);
        cy.visit("/new-user");
    });

    it("should have basic elements", () => {
        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
        cy.get("#new-username-input").should("exist");
        cy.get("#new-password-input").should("exist");
        cy.get("#ack-input input").should("have.length", 24);
    });

    it("should handle initial signup gracefully", () => {
        // Initial checks
        cy.get("#vault-key-modal").should("not.be.visible");

        // Fill in signup form
        const username = `new-test-user-${Date.now()}`;
        cy.get("#new-username-input").find("input").type(username);
        cy.get("#new-password-input").find("input").type("Password123");

        // Fill in Account Creation Key (ACK)
        cy.get("#ack-input")
            .find("input")
            .each(($el, index) => {
                const el = cy.wrap($el);
                el.type(ack[index]);
                el.blur();
            });

        cy.contains("ion-button", "Confirm").click();

        // Assert that the vault key dialog shows up
        cy.get("#vault-key-modal").should("be.visible");
        cy.get("#vault-key-modal-close").click();

        // We should have been redirected to the login page
        cy.url().should("include", "/login");

        // Now try to log in again
        cy.get("#username-input").find("input").type(username);
        cy.get("#password-input").find("input").type("Password123");
        cy.get("#login-button").click();

        // Ensure login successful
        cy.url().should("include", "/files");
    });
});
