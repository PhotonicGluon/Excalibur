export {};

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
            cy.then(() => expect(window.localStorage.getItem("serverInfo"), "stored value").to.not.be.null);
        },
        {
            validate: () => {
                // We should be able to access the login page
                cy.visit("/login");
                cy.url().should("include", "/login");

                // We should *not* be able to access the files page
                cy.visit("/files/");
                cy.url()
                    .should("include", "/login")
                    .then(() => expect(window.localStorage.getItem("serverInfo"), "stored value").to.not.be.null);
            },
            cacheAcrossSpecs: true,
        },
    );
});

Cypress.Commands.add("login", (serverURL: string, username: string, password: string) => {
    cy.session(
        [serverURL, username],
        () => {
            cy.onboard(serverURL);
            cy.visit("/login");

            // Login using form
            cy.get("#username-input > .input-wrapper").type(username);
            cy.get("#password-input > .input-wrapper").type(password);
            cy.get("#login-button").click();

            cy.url().should("include", "/files");

            cy.then(() => {
                expect(window.localStorage.getItem("serverInfo"), "stored value").to.not.be.null;
                expect(window.localStorage.getItem("authInfo"), "stored value").to.not.be.null;
            });
        },
        {
            validate: () => {
                // We should be able to access the files page
                cy.visit("/files/");
                cy.url()
                    .should("include", "/files")
                    .then(() => {
                        expect(window.localStorage.getItem("serverInfo"), "stored value").to.not.be.null;
                        expect(window.localStorage.getItem("authInfo"), "stored value").to.not.be.null;
                    });
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
