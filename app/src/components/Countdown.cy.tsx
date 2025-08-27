import { IonApp } from "@ionic/react";

import Countdown from "./Countdown";

describe("<Countdown />", () => {
    const initial = new Date(2021, 3, 14);
    const expDate = new Date(initial.getTime() + 60 * 1000); // 1 minute from start
    function renderComponent(props: { endDate: Date; onExpiry: () => void }) {
        return cy.mount(
            <IonApp>
                <Countdown id="countdown" {...props} />
            </IonApp>,
        );
    }

    beforeEach(() => {
        cy.clock(initial);
    });

    it("renders correctly", () => {
        renderComponent({ endDate: expDate, onExpiry: () => {} });
        cy.get("#countdown").should("exist");
        cy.get("#countdown").should("have.text", "00:01:00");
    });

    it("ticks down", () => {
        renderComponent({ endDate: expDate, onExpiry: () => {} });
        cy.tick(1000); // 1s
        cy.get("#countdown").should("have.text", "00:00:59");
        cy.tick(5000); // 5s
        cy.get("#countdown").should("have.text", "00:00:54");
    });

    it("expires", () => {
        const onExpiry = cy.spy().as("onExpiry");
        renderComponent({ endDate: expDate, onExpiry });
        cy.tick(10 * 1000); // 10 s
        cy.get("@onExpiry").should("not.have.been.called");
        cy.tick(50 * 1000); // 50 s
        cy.get("#countdown").should("have.text", "00:00:00");
        cy.get("@onExpiry").should("have.been.calledOnce");
        cy.tick(10 * 1000); // 10 s, should not change
        cy.get("#countdown").should("have.text", "00:00:00");
        cy.get("@onExpiry").should("have.been.calledOnce");
    });
});
