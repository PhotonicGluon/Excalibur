import { IonApp } from "@ionic/react";

import { Directory, File } from "@lib/files/structures";
import { RowAlternatingColours } from "@lib/preferences/settings";

import { settingsContext } from "@components/settings/context";

import DirectoryList from "./DirectoryList";

const files: File[] = [];
for (let i = 0; i < 10; i++) {
    files.push({
        name: `Sample File ${i}.txt.exef`,
        fullpath: `/some/path/Sample File ${i}.txt.exef`,
        size: 100000 * (i + 1) + 23456,
        type: "file",
        mimetype: "audio/mpeg",
    });
}
const directory: Directory = {
    name: "Sample Directory",
    fullpath: "/some/path",
    type: "directory",
    items: [files[2]],
};
const items = [...files, directory];

describe("<DirectoryList />", () => {
    function renderComponent(props = {}, rowAlternatingColours: RowAlternatingColours = "off") {
        const defaultProps: Directory = {
            items,
            fullpath: "/some/path",
            name: "A Directory",
            type: "directory",
            ...props,
        };

        return cy.mount(
            <IonApp>
                <settingsContext.Provider
                    value={{
                        theme: "dark",
                        rowAlternatingColours,
                        fileSizeUnits: "si",
                        cryptoChunkSize: 262144,
                        change: () => {},
                        save: () => Promise.resolve(),
                    }}
                >
                    <DirectoryList id="directory-list" {...defaultProps} />
                </settingsContext.Provider>
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();
        cy.get("#directory-list").should("exist");

        // Sorting buttons should be present
        cy.get("#directory-list ion-grid").should("exist");
        cy.get("#directory-list ion-grid ion-label").get("ion-label").eq(0).should("have.text", "Name");

        // Items should be present
        cy.get("#directory-list ion-list").should("exist");
        cy.get("#directory-list ion-list").get("ion-item").should("have.length", items.length);

        // Items should be in the correct order
        cy.get("#directory-list ion-list").get("ion-item").eq(0).should("have.text", "Sample Directory"); // First item is the directory
        cy.get("#directory-list ion-list").get("ion-item").eq(1).should("contain.text", "Sample File"); // Second item is the file

        // Row colour classes should be identical (since rowAlternatingColours is "off")
        cy.get("#directory-list ion-list > ion-item")
            .eq(0)
            .then(($el) => {
                cy.get("#directory-list ion-list > ion-item").eq(1).should("have.class", $el.attr("class"));
            });
    });

    it("renders correctly for no items", () => {
        renderComponent({ items: [] });
        cy.get("#directory-list").should("exist");

        cy.get("#directory-list ion-list").should("exist");
        cy.get("#directory-list ion-list").should("contain.text", "No items");
    });

    it("renders row alternating colours", () => {
        renderComponent({}, "normal");
        // Row colour classes should be different (since rowAlternatingColours is "normal")
        cy.get("#directory-list ion-list > ion-item")
            .eq(0)
            .then(($el) => {
                cy.get("#directory-list ion-list > ion-item").eq(1).should("not.have.class", $el.attr("class"));
            });
    });
});
