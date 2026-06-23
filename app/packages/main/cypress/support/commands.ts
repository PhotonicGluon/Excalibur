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

Cypress.Commands.add("login", (serverURL: string, username: string, password: string, expectToFail?: boolean) => {
    cy.session(
        ["login", serverURL, username, password],
        () => {
            cy.onboard(serverURL);
            cy.visit("/login");

            // Login using form
            cy.get("[label='Username']").type("{selectAll}" + username);
            cy.get("[label='Password']").type("{selectAll}" + password);
            cy.get("#login-button").click();

            if (expectToFail) {
                cy.url().should("not.include", "/files");
                return;
            }

            cy.url().should("include", "/files");
            cy.window().should((win) => {
                expect(win.localStorage.getItem("serverInfo"), "serverInfo").to.not.be.null;
                expect(win.localStorage.getItem("authInfo"), "authInfo").to.not.be.null;
            });
        },
        {
            validate: () => {
                if (expectToFail) {
                    return;
                }
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

Cypress.Commands.add("signup", (serverURL: string, username: string, password: string) => {
    cy.session(
        ["signup", serverURL, username, password],
        () => {
            let ack: string[];

            cy.onboard(serverURL);
            cy.visit("/new-user");

            // Initial checks
            cy.get("#vault-key-modal").should("not.be.visible");

            // Get ACK
            cy.request({
                url: `${serverURL}/api/auth/ack`,
                method: "GET",
            }).then((response) => {
                expect(response.body).to.have.length(24);
                ack = response.body;
            });

            // Fill in signup form
            cy.get("[label='Username']").find("input").type(username);
            cy.get("[label='Password']").find("input").type(password);
            cy.get("[label='Confirm Password']").find("input").type(password);

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
        },
        {
            validate: () => {
                cy.request({
                    url: `${serverURL}/api/users/check/${username}`,
                    method: "HEAD",
                }).then((response) => {
                    expect(response.status).to.eq(200);
                });
            },
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
            login(serverURL: string, username: string, password: string, expectToFail?: boolean): Chainable<void>;
            signup(serverURL: string, username: string, password: string): Chainable<void>;
            pullRefresh(): Chainable<void>;
        }
    }
}
