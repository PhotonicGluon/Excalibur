export {};

Cypress.Commands.add("onboard", (serverURL: string) => {
    cy.session(
        serverURL,
        () => {
            cy.visit("/welcome");
            cy.get("#continue-button").click();

            cy.url().should("include", "/server-choice");
            cy.get("#server-input").type("{selectAll}{del}" + serverURL);
            cy.get("#confirm-button").click();

            cy.url().should("include", "/login");
            cy.window().should((win) => {
                expect(win.localStorage.getItem("serverInfo"), "serverInfo").to.not.be.null;
            });
        },
        {
            validate: () => {
                cy.window().then((win) => {
                    const serverInfo = win.localStorage.getItem("serverInfo");
                    if (!serverInfo) {
                        throw new Error("Session invalid: serverInfo missing");
                    }
                });
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
            cy.get("#username-input").type("{selectAll}" + username);
            cy.get("#password-input").type("{selectAll}" + password);
            cy.get("#login-button").click();

            cy.url().should("include", "/files");

            cy.window().should((win) => {
                expect(win.localStorage.getItem("serverInfo"), "serverInfo").to.not.be.null;
                expect(win.localStorage.getItem("authInfo"), "authInfo").to.not.be.null;
            });
        },
        {
            validate: () => {
                cy.window().then((win) => {
                    const authInfo = win.localStorage.getItem("authInfo");
                    if (!authInfo) {
                        throw new Error("Session invalid: authInfo missing");
                    }
                });
            },
            cacheAcrossSpecs: true,
        },
    );
});

Cypress.Commands.add("pullRefresh", () => {
    cy.get("ion-refresher").then(($refresher) => {
        // Manually dispatch the event that IonRefresher listens for
        const event = new CustomEvent("ionRefresh", {
            bubbles: true,
            cancelable: true,
            detail: {
                complete: () => {
                    $refresher[0].complete();
                },
            },
        });
        $refresher[0].dispatchEvent(event);
    });
});

declare global {
    namespace Cypress {
        interface Chainable {
            onboard(serverURL: string): Chainable<void>;
            login(serverURL: string, username: string, password: string): Chainable<void>;
            pullRefresh(): Chainable<void>;
        }
    }
}
