import { IonApp } from "@ionic/react";

import { Directory, File } from "@lib/files/structures";
import { RowAlternatingColours } from "@lib/preferences/settings";

import { settingsContext } from "@components/settings/context";

import DirectoryList from "./DirectoryList";
import { NUM_PENDING_ITEMS } from "./DirectoryListRaw";
import { explorerContext } from "./context";

const files: File[] = [];
for (let i = 0; i < 10; i++) {
    files.push({
        name: `Sample File ${i}.txt.exef`,
        fullpath: `/some/path/Sample File ${i}.txt.exef`,
        size: 100000 * (i + 1) + 23456,
        type: "file",
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
    function renderComponent(
        props = {},
        rowAlternatingColours: RowAlternatingColours = "off",
        pretendPending: boolean = false,
    ) {
        const defaultProps: Directory = {
            items,
            fullpath: ".",
            name: "A Directory",
            type: "directory",
            ...props,
        };

        return cy.mount(
            <IonApp>
                <explorerContext.Provider
                    value={{
                        path: defaultProps.fullpath,
                        onRename: () => Promise.resolve(),
                        onMove: () => Promise.resolve(),
                        onDelete: () => Promise.resolve(),
                        presentAlert: () => Promise.resolve(),
                        dismissAlert: () => Promise.resolve(),
                        presentSnackbar: () => Promise.resolve(),
                    }}
                >
                    <settingsContext.Provider
                        value={{
                            theme: "dark",
                            iconStyle: "default",
                            rowAlternatingColours,
                            fileSizeUnits: "si",
                            cryptoKeyStrength: 128,
                            cryptoChunkSize: 262144,
                            change: () => {},
                            save: () => Promise.resolve(),
                            checkUpdate: false,
                            checkUpdateInterval: 0,
                        }}
                    >
                        <DirectoryList id="directory-list" directory={pretendPending ? null : defaultProps} />
                    </settingsContext.Provider>
                </explorerContext.Provider>
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();
        cy.get("#directory-list").should("exist");

        // Sorting buttons should be present
        cy.get("#directory-list ion-grid").should("exist");
        cy.get("#directory-list ion-grid ion-label").get("ion-label").contains("Name");

        // Items should be present
        cy.get("#directory-list ion-list").should("exist");
        cy.get("#directory-list ion-list").get("ion-item").should("have.length", items.length);

        // Item count should be correct
        cy.get("#directory-list ion-grid ion-label").get("ion-label").contains(`${items.length} Items`);

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
        cy.get("#directory-list ion-label").should("contain.text", "No items");
        cy.get("#directory-list ion-grid ion-label").get("ion-label").contains("0 Items");
    });

    it("renders correctly if has parent directory", () => {
        renderComponent({ fullpath: "/some/path" });
        cy.get("#directory-list").should("exist");

        // Items should be present
        cy.get("#directory-list ion-list")
            .get("ion-item")
            .should("have.length", items.length + 1);

        // Items should be in the correct order
        cy.get("#directory-list ion-list").get("ion-item").eq(0).should("have.text", "(Go Back)"); // First item is the directory
        cy.get("#directory-list ion-list").get("ion-item").eq(1).should("have.text", "Sample Directory"); // First item is the directory
        cy.get("#directory-list ion-list").get("ion-item").eq(2).should("contain.text", "Sample File"); // Second item is the file
    });

    it("renders correctly if pending", () => {
        renderComponent({}, "off", true);
        cy.get("#directory-list").should("exist");

        cy.get("#directory-list ion-list").should("exist");
        cy.get("#directory-list ion-list").get("ion-item").should("have.length", NUM_PENDING_ITEMS);
        cy.get("#directory-list ion-skeleton-text").should("exist");
        cy.get("#directory-list ion-grid ion-label").get("ion-label").contains("Items").should("not.exist");
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
