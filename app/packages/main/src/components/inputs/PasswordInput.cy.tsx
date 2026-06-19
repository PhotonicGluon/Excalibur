import PasswordInput from "./PasswordInput";

describe("<PasswordInput />", () => {
    describe("single mode", () => {
        it("renders with a placeholder", () => {
            cy.mount(<PasswordInput />);
            cy.get("ion-input").should("have.attr", "placeholder", "My secure password!");
        });

        it("triggers onPasswordChange when password is changed", () => {
            const PASSWORD = "Password!";

            const onPasswordChange = cy.stub();
            cy.mount(<PasswordInput onPasswordChange={onPasswordChange} />);
            cy.get("ion-input").type(PASSWORD);

            for (let i = 1; i <= PASSWORD.length; i++) {
                cy.wrap(onPasswordChange).should("have.been.calledWith", PASSWORD.substring(0, i));
            }
        });
    });

    describe("confirmation mode", () => {
        it("renders two password fields", () => {
            cy.mount(<PasswordInput confirmation />);
            cy.get("ion-input").should("have.length", 2);
        });

        it("warns if passwords do not match", () => {
            cy.mount(<PasswordInput confirmation />);
            cy.get("ion-input").eq(0).type("A");
            cy.get("ion-input").eq(1).type("B");

            cy.get("ion-label").should("contain", "Passwords do not match!");
        });

        it("always triggers onPasswordChange if first password is visible", () => {
            const PASSWORD = "Password!";

            const onPasswordChange = cy.stub();
            cy.mount(<PasswordInput confirmation onPasswordChange={onPasswordChange} />);
            cy.get("[label='Password'] > .input-wrapper > .native-wrapper > .md").click();
            cy.get("ion-input").eq(0).type(PASSWORD);

            for (let i = 1; i <= PASSWORD.length; i++) {
                cy.wrap(onPasswordChange).should("have.been.calledWith", PASSWORD.substring(0, i));
            }
        });

        it("triggers onPasswordChange only when password matches", () => {
            const PASSWORD = "Password!";

            const onPasswordChange = cy.stub();
            cy.mount(<PasswordInput confirmation onPasswordChange={onPasswordChange} />);
            cy.get("ion-input").eq(0).type(PASSWORD);
            cy.get("ion-input").eq(1).type(PASSWORD);

            for (let i = 1; i <= PASSWORD.length - 1; i++) {
                cy.wrap(onPasswordChange).should("have.not.been.calledWith", PASSWORD.substring(0, i));
            }
            cy.wrap(onPasswordChange).should("have.been.calledWith", PASSWORD);
        });
    });
});
