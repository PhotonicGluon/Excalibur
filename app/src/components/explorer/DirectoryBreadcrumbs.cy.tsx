import { IonApp } from "@ionic/react";

import DirectoryBreadcrumbs from "./DirectoryBreadcrumbs";

describe("<DirectoryBreadcrumbs />", () => {
    function renderComponent(path = ".") {
        return cy.mount(
            <IonApp>
                <DirectoryBreadcrumbs id="directory-breadcrumbs" path={path} />
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();

        // Check if main parts are there
        cy.get("#directory-breadcrumbs").should("exist");
        cy.get("#directory-breadcrumbs ion-breadcrumb").should("have.length", 1);

        // Check if the URL is correct
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(0).should("have.attr", "router-link", "/files/");
    });

    it("renders correctly for path", () => {
        renderComponent("some/path");

        // Check if breadcrumbs are there
        cy.get("#directory-breadcrumbs ion-breadcrumb").should("have.length", 3);

        // Check if each breadcrumb's URL is correct
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(0).should("have.attr", "router-link", "/files/");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(1).should("have.attr", "router-link", "/files/some");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(2).should("have.attr", "router-link", "/files/some/path");
    });
});
