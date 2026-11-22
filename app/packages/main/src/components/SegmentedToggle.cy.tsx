import { IonApp } from "@ionic/react";

import SegmentedToggle from "./SegmentedToggle";

type MyTestType = "alpha" | "bravo";

describe("<SegmentedToggle />", () => {
    function renderComponent(
        props: Partial<{
            defaultValue: MyTestType;
            onChange: (value: MyTestType) => void;
        }> = {
            defaultValue: "alpha",
            onChange: (_) => {},
        },
    ) {
        return cy.mount(
            <IonApp>
                <SegmentedToggle<MyTestType>
                    values={["alpha", "bravo"]}
                    displayNodes={[<span>1</span>, <span>2</span>]}
                    defaultValue={props.defaultValue!}
                    onChange={props.onChange!}
                />
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();

        cy.get("button").should("have.length", 2);
        cy.get("button").first().should("have.attr", "aria-selected", "true"); // First should be selected by default
        cy.get("button").last().should("have.attr", "aria-selected", "false"); // Second should not be selected by default
    });

    it("renders with default value", () => {
        renderComponent({ defaultValue: "bravo" });

        cy.get("button").should("have.length", 2);
        cy.get("button").first().should("have.attr", "aria-selected", "false"); // First should not be selected
        cy.get("button").last().should("have.attr", "aria-selected", "true"); // Second should be selected by default
    });

    it("calls onChange when value is changed", () => {
        const onChange = cy.stub();
        renderComponent({ onChange });

        cy.get("button").first().click();
        cy.get("button").first().should("have.attr", "aria-selected", "true");
        cy.get("button").last().should("have.attr", "aria-selected", "false");
        cy.wrap(onChange).should("have.been.calledWith", "alpha");

        cy.get("button").last().click();
        cy.get("button").first().should("have.attr", "aria-selected", "false");
        cy.get("button").last().should("have.attr", "aria-selected", "true");
        cy.wrap(onChange).should("have.been.calledWith", "bravo");
    });
});
