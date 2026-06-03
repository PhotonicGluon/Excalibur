import { useState } from "react";

import { IonApp, IonContent } from "@ionic/react";

import Modal from "./Modal";

describe("<Modal />", () => {
    function mount(element: React.ReactNode) {
        cy.mount(
            <IonApp>
                <IonContent>{element}</IonContent>
                <style>
                    {`
                        ion-modal ion-content {
                            min-height: 50vh;
                        }
                    `}
                </style>
            </IonApp>,
        );
    }

    const TestModal = (props: { isShown: boolean; setIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
        return (
            <Modal isShown={props.isShown} setIsShown={props.setIsShown} header={<h1 id="header-test">Test Header</h1>}>
                <span id="child-test" style={{ display: "block" }}>
                    Test Child
                </span>
            </Modal>
        );
    };

    it("should render with header and children", () => {
        mount(<TestModal isShown={true} setIsShown={() => {}} />);

        cy.get("ion-modal").should("be.visible");
        cy.get("#header-test").should("be.visible");
        cy.get("#child-test").should("not.exist");
    });

    it("should toggle expansion when expand button is clicked", () => {
        mount(<TestModal isShown={true} setIsShown={() => {}} />);

        // Initially it is semi visible
        cy.get("ion-modal").should("be.visible");
        cy.get("#child-test").should("not.exist");

        // Expanding shows the child
        cy.get("ion-button[aria-label='Expand modal']").click();
        cy.get("#child-test").should("be.visible");

        // Collapsing hides the child
        cy.get("ion-button[aria-label='Collapse modal']").click(); // It's the same button with a different label
        cy.get("#child-test").should("not.exist");
    });

    describe("close button", () => {
        beforeEach(() => {
            const Wrapper = () => {
                const [shown, setShown] = useState(true);
                return <TestModal isShown={shown} setIsShown={setShown} />;
            };

            mount(<Wrapper />);

            cy.get("ion-modal").should("be.visible");
        });

        it("should work", () => {
            cy.get("ion-button[aria-label='Close modal']").click();
            cy.get("ion-modal").should("not.be.visible");
        });

        it("should work even when expanded", () => {
            cy.get("ion-button[aria-label='Expand modal']").click();
            cy.get("ion-button[aria-label='Close modal']").click();
            cy.get("ion-modal").should("not.be.visible");
        });
    });
});
