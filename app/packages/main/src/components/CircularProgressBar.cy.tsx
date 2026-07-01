import { IonApp } from "@ionic/react";

import CircularProgressBar from "./CircularProgressBar";

describe("<CircularProgressBar />", () => {
    function mount(element: React.ReactNode) {
        cy.mount(
            <IonApp>
                <div style={{ width: "50px", height: "50px" }}>{element}</div>
            </IonApp>,
        );
    }

    it("should render an IonSpinner when value is null", () => {
        mount(<CircularProgressBar value={null} />);

        // Check for the spinner's visibility
        cy.get("ion-spinner").should("be.visible");
        cy.get(".CircularProgressbar").should("not.exist");
    });

    it("should render the circular progress bar when a value is provided", () => {
        mount(<CircularProgressBar value={0.75} />);

        // Check for the progress bar's visibility
        cy.get(".CircularProgressbar").should("be.visible");
        cy.get("ion-spinner").should("not.exist");

        // Check that progress bar has correct aria value
        cy.get(".circular-progress-bar").should("have.attr", "aria-valuenow", "75");
    });

    it("should render the spinner with a custom colour", () => {
        mount(<CircularProgressBar value={null} colour="danger" />);
        cy.get("ion-spinner").should("have.class", "ion-color-danger");
    });

    it("should apply aria label to the progress bar", () => {
        mount(<CircularProgressBar value={0.25} ariaLabel="Loading" />);
        cy.get(".circular-progress-bar").should("have.attr", "aria-label", "Loading");
    });

    it("should apply custom classes to the spinner", () => {
        // Indeterminate
        mount(<CircularProgressBar value={null} className="my-spinner-class" />);
        cy.get(".circular-progress-bar").should("have.class", "my-spinner-class");

        // Determinate
        mount(<CircularProgressBar value={0.25} className="my-progress-class" />);
        cy.get(".circular-progress-bar").should("have.class", "my-progress-class");
    });
});
