import { IonApp } from "@ionic/react";

import URLInput from "./URLInput";

describe("<URLInput />", () => {
    function renderComponent(props = {}) {
        const defaultProps = {
            label: "Test URL",
            ...props,
        };

        return cy.mount(
            <IonApp>
                <URLInput id="url-input" {...defaultProps} />
            </IonApp>,
        );
    }

    it("renders with default props", () => {
        renderComponent();

        cy.get("#url-input").should("exist");
        cy.get("#url-input").should("have.attr", "placeholder", "https://example.com");
        cy.get("#url-input").should("have.attr", "label", "Test URL");
    });

    it("displays error for invalid URL format", () => {
        renderComponent();
        cy.get("#url-input").type("not-a-url");

        // Trigger blur to validate
        cy.get("#url-input .native-input").focus();
        cy.get("#url-input .native-input").blur();

        cy.get("#url-input").should("not.have.class", "ion-valid");
        cy.get("#url-input").should("have.class", "ion-invalid");
        cy.get(".error-text").should("be.visible");
    });

    it("accepts valid URL format", () => {
        renderComponent();
        cy.get("#url-input").type("https://example.com");

        // Trigger blur to validate
        cy.get("#url-input .native-input").focus();
        cy.get("#url-input .native-input").blur();

        cy.get("#url-input").should("have.class", "ion-valid");
        cy.get("#url-input").should("not.have.class", "ion-invalid");
        cy.get(".error-text").should("be.hidden");
    });

    it("applies custom class name", () => {
        renderComponent({ className: "custom-class" });
        cy.get("#url-input").should("have.class", "custom-class");
    });

    it("calls onKeyDown when provided", () => {
        const handleKeyDown = cy.spy().as("handleKeyDown");

        renderComponent({ onKeyDown: handleKeyDown });
        cy.get("#url-input").type("http://example.com");
        cy.get("@handleKeyDown").should("have.been.called");
    });

    it("respects disabled prop", () => {
        renderComponent({ disabled: true });
        cy.get("#url-input .native-input").should("be.disabled");
    });
});
