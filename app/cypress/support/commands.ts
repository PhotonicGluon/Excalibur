/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

export {};

Cypress.Commands.add("login", (serverURL: string, password: string) => {
    cy.session(
        serverURL,
        () => {
            cy.exec("cd .. && npm run server:setup-for-test");
            cy.visit("/login");

            cy.get("#server-input > .input-wrapper").type(serverURL);
            cy.get("#password-input > .input-wrapper").type(password);
            cy.get("#login-button").click();
        },
        {
            validate: () => {
                cy.url().should("include", "/files/");
            },
            cacheAcrossSpecs: true,
        },
    );
});

declare global {
    namespace Cypress {
        interface Chainable {
            login(serverURL: string, password: string): Chainable<void>;
        }
    }
}
