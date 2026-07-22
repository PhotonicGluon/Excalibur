describe("Check Preferences Page Contents", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    beforeEach(() => {
        cy.login(SERVER_URL, "test-user", "Password");
        cy.gotoPreferences();
    });

    it("should have basic navigation", () => {
        cy.get(".buttons-first-slot > .button").should("exist"); // Back button
    });

    it("should have settings submenus", () => {
        cy.get("#preferences-account").should("exist");
        cy.get("#preferences-data").should("exist");
    });
});

describe("Check Account Preferences", () => {
    const SERVER_URL = Cypress.expose("serverURL");

    let oldUsername: string;
    let oldPassword: string;

    beforeEach(() => {
        oldUsername = `new-test-user-${Date.now()}`;
        oldPassword = "Password";
        cy.signup(SERVER_URL, oldUsername, oldPassword);
        cy.gotoPreferences();
        cy.get("#preferences-account").click();
        cy.url().should("include", "/preferences/account");
    });

    it("should be able to change username", () => {
        const renamedUsername = `renamed-${Date.now()}`;

        // Fill in new username
        cy.get(".mt-2 > :nth-child(1) > :nth-child(2)").type(`{selectAll}{backspace}${renamedUsername}{enter}`);

        cy.get("#save-changes-button").click();
        cy.get("ion-modal").should("exist");
        cy.get("ion-modal [label='Password']").type(oldPassword);
        cy.get("ion-modal ion-footer ion-button").click();
        cy.get("ion-toast[color='success']", { timeout: 30000 }).should("exist");

        // Trying to log in with old username should fail
        cy.login(SERVER_URL, oldUsername, oldPassword, true);
        cy.url().should("include", "/login");

        // Check if we can login with the new username
        cy.login(SERVER_URL, renamedUsername, oldPassword);
        cy.url().should("include", "/files");
    });

    it("should be able to change password", () => {
        const changedPassword = `password-${Date.now()}`;

        // Fill in new password
        cy.get("ion-grid [label='Password']").type(`{selectAll}{backspace}${changedPassword}{enter}`);
        cy.get("ion-grid [label='Confirm Password']").type(`{selectAll}{backspace}${changedPassword}{enter}`);

        cy.get("#save-changes-button").click();
        cy.get("ion-modal").should("exist");
        cy.get("ion-modal [label='Password']").type(oldPassword);
        cy.get("ion-modal ion-footer ion-button").click();

        cy.get("ion-toast[color='success']", { timeout: 30000 }).should("exist");

        // Trying to log in with old password should fail
        cy.login(SERVER_URL, oldUsername, oldPassword, true);
        cy.url().should("include", "/login");

        // Check if we can login with the new password
        cy.login(SERVER_URL, oldUsername, changedPassword);
        cy.url().should("include", "/files");
    });
});
