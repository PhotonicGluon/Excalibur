export {};

Cypress.session.clearAllSavedSessions();

Cypress.Commands.add("onboard", (serverURL: string) => {
    cy.session(
        serverURL,
        () => {
            cy.visit("/welcome");
            cy.get("#continue-button").click();
            cy.url().should("include", "/server-choice");
            cy.get("#server-input").type(serverURL);
            cy.get("#confirm-button").click();
            cy.url().should("include", "/login");
        },
        {
            validate: () => {
                cy.visit("/login");
                cy.url().should("include", "/login");
            },
            cacheAcrossSpecs: true,
        },
    );
});

Cypress.Commands.add("login", (serverURL: string, username: string, password: string) => {
    cy.session(
        username,
        () => {
            cy.onboard(serverURL);
            cy.visit("/login");

            // Login using form
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
            onboard(serverURL: string): Chainable<void>;
            login(serverURL: string, username: string, password: string): Chainable<void>;
        }
    }
}
