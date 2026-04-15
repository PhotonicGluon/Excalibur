let ack: string[];
describe("New User Page", () => {
    const SERVER_URL = Cypress.expose("serverURL");

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

        // Fill in Account Creation Key (ACK) by pasting into the first input box
        cy.get("#ack-input")
            .find("input")
            .eq(0)
            .trigger("paste", {
                clipboardData: { getData: () => ack.join(" ") },
            });

        cy.contains("ion-button", "Confirm").click();

        // Assert that the vault key dialog shows up
        cy.get("#vault-key-modal").should("be.visible");
        cy.get("#vault-key-modal-close").click();

        // We should have been redirected to the files page (i.e., logged in successfully)
        cy.url().should("include", "/files/");

        // Try to log in with the new username
        cy.login(SERVER_URL, username, "Password123"); // This checks if login was successful too
    });
});
