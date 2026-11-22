const SERVER_URL = Cypress.expose("serverURL");

it("should setup screenshotter gracefully", () => {
    cy.signup(SERVER_URL, "screenshotter", "Password");
});
