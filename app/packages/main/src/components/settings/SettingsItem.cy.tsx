import { IonApp, IonLabel, IonList, IonText } from "@ionic/react";

import SettingsItem from "./SettingsItem";

describe("<SettingsItem />", () => {
    function renderComponent(props: { label: React.ReactNode; input: React.ReactNode }) {
        return cy.mount(
            <IonApp>
                <IonList>
                    <SettingsItem id="settings-item" {...props} />
                </IonList>
            </IonApp>,
        );
    }

    it("renders correctly using text", () => {
        renderComponent({ label: "Test Label", input: "Test Input" });
        cy.get("#settings-item").should("exist");
    });

    it("renders correctly using nodes", () => {
        renderComponent({ label: <IonLabel>Test Label</IonLabel>, input: <IonText>Test Input</IonText> });
        cy.get("#settings-item").should("exist");
        cy.get("ion-label").should("exist");
        cy.get("ion-label").should("have.text", "Test Label");
        cy.get("ion-text").should("exist");
        cy.get("ion-text").should("have.text", "Test Input");
    });
});
