export {};

Cypress.Commands.add("login", (serverURL: string, username: string, password: string) => {
    // Cypress.session.clearAllSavedSessions(); // TODO: Remove
    cy.session(
        username,
        () => {
            cy.visit("/login");

            // Login using form
            cy.get("#server-input > .input-wrapper").type(serverURL);
            cy.get("#username-input > .input-wrapper").type(username);
            cy.get("#password-input > .input-wrapper").type(password);
            cy.get("#login-button").click();

            cy.url().should("include", "/files");
        },
        {
            validate: () => {
                cy.visit("/files/");
                cy.url().should("include", "/files");
            },
            cacheAcrossSpecs: true,
        },
    );
});

declare global {
    namespace Cypress {
        interface Chainable {
            login(serverURL: string, username: string, password: string): Chainable<void>;
        }
    }
}
