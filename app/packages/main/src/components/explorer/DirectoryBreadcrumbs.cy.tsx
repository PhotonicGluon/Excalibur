import { IonApp } from "@ionic/react";

import { SubstitutionCipher } from "@lib/files/obfuscation";

import DirectoryBreadcrumbs from "./DirectoryBreadcrumbs";

describe("<DirectoryBreadcrumbs />", () => {
    function renderComponent(path = ".", noc?: SubstitutionCipher) {
        return cy.mount(
            <IonApp>
                <DirectoryBreadcrumbs id="directory-breadcrumbs" path={path} noc={noc} />
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
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(1).should("contain", "some");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(2).should("contain", "path");

        // Check if each breadcrumb's URL is correct
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(0).should("have.attr", "router-link", "/files/");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(1).should("have.attr", "router-link", "/files/some");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(2).should("have.attr", "router-link", "/files/some/path");
    });

    it("renders correctly for obfuscated path", () => {
        const noc = new SubstitutionCipher(Buffer.from("test"));
        const obfuscatedPathFragments = [
            noc.encipher(Buffer.from("some", "utf-8")),
            noc.encipher(Buffer.from("path", "utf-8")),
        ];
        const obfuscatedPath = obfuscatedPathFragments.join("/");
        renderComponent(obfuscatedPath, noc);

        // Check if breadcrumbs are there
        cy.get("#directory-breadcrumbs ion-breadcrumb").should("have.length", 3);
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(1).should("contain", "some");
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(2).should("contain", "path");

        // Check if each breadcrumb's URL is correct
        cy.get("#directory-breadcrumbs ion-breadcrumb").eq(0).should("have.attr", "router-link", "/files/");
        cy.get("#directory-breadcrumbs ion-breadcrumb")
            .eq(1)
            .should("have.attr", "router-link", "/files/" + obfuscatedPathFragments[0]);
        cy.get("#directory-breadcrumbs ion-breadcrumb")
            .eq(2)
            .should("have.attr", "router-link", "/files/" + obfuscatedPathFragments.join("/"));
    });
});
