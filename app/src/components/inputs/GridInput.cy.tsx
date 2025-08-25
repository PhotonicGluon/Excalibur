import { IonApp } from "@ionic/react";

import GridInput from "./GridInput";

describe("<GridInput />", () => {
    function renderComponent(props = {}) {
        return cy.mount(
            <IonApp>
                <GridInput id="grid-input" {...props} />
            </IonApp>,
        );
    }

    it("renders with default props", () => {
        renderComponent();
        cy.get("#grid-input").should("exist");

        // Check if we have 16 inputs
        cy.get("ion-input").should("have.length", 16);
    });

    it("renders with value", () => {
        const value: string[] = Array.from({ length: 16 });
        for (let i = 0; i < 16; i++) {
            value[i] = i.toString().padStart(4, "0");
        }

        renderComponent({ value: value.join("") });
        cy.get("#grid-input").should("exist");

        // Check if all inputs are correct
        cy.get("ion-input").should("have.length", 16);
        for (let i = 0; i < 16; i++) {
            cy.get("ion-input").eq(i).should("have.value", value[i]);
        }
    });

    describe("renders correct value when typed", () => {
        const testValues = ["1234", "ABCD", "00GG", "1G2H", "????", "AMAZED!"];
        for (const value of testValues) {
            const expectedValue = value.replace(/[^0-9a-f]/gi, "").toUpperCase();

            it(`'${value}' as '${expectedValue}'`, () => {
                renderComponent();
                cy.get("#grid-input").should("exist");
                cy.get("ion-input").first().type(value);
                cy.get("ion-input").first().should("have.value", expectedValue);
            });
        }
    });

    it("calls onChange when value changes", () => {
        const onValueChange = cy.spy().as("onValueChange");

        renderComponent({ onChange: onValueChange });
        cy.get("#grid-input").should("exist");
        cy.get("ion-input").first().type("1234");
        cy.get("@onValueChange").should("have.been.called");
    });

    it("respects disabled prop", () => {
        renderComponent({ disabled: true });
        cy.get("#grid-input").should("exist");

        // Check if all inputs are disabled
        cy.get("ion-input").should("have.length", 16);
        for (let i = 0; i < 16; i++) {
            cy.get("ion-input .native-input").eq(i).should("be.disabled");
        }
    });
});
