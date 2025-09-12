import { IonApp } from "@ionic/react";
import { documentOutline, musicalNotesOutline } from "ionicons/icons";

import { settingsContext } from "@components/settings/context";

import DirectoryItem, { ContainerProps } from "./DirectoryItem";
import { uiFeedbackContext } from "./context";

describe("<DirectoryItem />", () => {
    function renderComponent(
        props: Partial<
            ContainerProps & {
                renameHook: () => Promise<void>;
                deleteHook: () => Promise<void>;
            }
        > = { renameHook: () => Promise.resolve(), deleteHook: () => Promise.resolve() },
    ) {
        const defaultProps: ContainerProps = {
            oddRow: true,
            name: "Sample File.txt.exef",
            fullpath: "/some/path",
            size: 123456,
            type: "file",
            ...props,
        };

        return cy.mount(
            <IonApp>
                <settingsContext.Provider
                    value={{
                        theme: "dark",
                        rowAlternatingColours: "normal",
                        fileSizeUnits: "si",
                        cryptoChunkSize: 262144,
                        change: () => {},
                        save: () => Promise.resolve(),
                    }}
                >
                    <uiFeedbackContext.Provider
                        value={{
                            onRename: (_path, _isDir) => props.renameHook!(),
                            onDelete: (_path, _isDir) => props.deleteHook!(),
                            presentAlert: () => Promise.resolve(),
                            presentToast: () => Promise.resolve(),
                            setProgress: () => {},
                            setShowDialog: () => {},
                            setDialogMessage: () => {},
                        }}
                    >
                        <DirectoryItem id="directory-item" {...defaultProps} />
                    </uiFeedbackContext.Provider>
                </settingsContext.Provider>
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();
        cy.get("#directory-item").should("exist");

        // Correct icon should be present
        cy.get("#directory-item ion-icon").should("exist");
        cy.get("#directory-item ion-icon").should("have.attr", "icon");

        // Correct name should be present
        cy.get("#directory-item ion-label").should("exist");
        cy.get("#directory-item ion-label").should("have.text", "Sample File.txt");

        // Correct size should be present
        cy.get("#directory-item ion-note").should("exist");
        cy.get("#directory-item ion-note").should("have.text", "123.46 kB");
    });

    it("keeps the .exef extension if specified", () => {
        renderComponent({ keepExEF: true });
        cy.get("#directory-item ion-label").should("exist");
        cy.get("#directory-item ion-label").should("have.text", "Sample File.txt.exef");
    });

    it("has correct icon for defined MIME type", () => {
        renderComponent({ mimetype: "audio/mpeg" });
        cy.get("#directory-item ion-icon").should("have.attr", "icon", musicalNotesOutline);
    });

    it("has correct default icon for undefined MIME type", () => {
        renderComponent({ mimetype: "fake/fake" });
        cy.get("#directory-item ion-icon").should("have.attr", "icon", documentOutline);
    });

    it("calls rename hook when rename button is clicked", () => {
        const renameHook = cy.stub().resolves();
        renderComponent({ renameHook });
        cy.get("#directory-item .button").click();
        cy.get(".item > .sc-ion-label-md-h").eq(0).click();
        cy.wrap(renameHook).should("have.been.called");
    });

    it("calls delete hook when delete button is clicked", () => {
        const deleteHook = cy.stub().resolves();
        renderComponent({ deleteHook });
        cy.get("#directory-item .button").click();
        cy.get(".item > .sc-ion-label-md-h").eq(1).click();
        cy.wrap(deleteHook).should("have.been.called");
    });
});
