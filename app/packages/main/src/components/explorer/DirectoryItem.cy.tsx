import { IonApp } from "@ionic/react";
import { documentOutline, musicalNotesOutline } from "ionicons/icons";

import { settingsContext } from "@components/settings/context";

import DirectoryItem, { ContainerProps } from "./DirectoryItem";
import { explorerContext } from "./context";
import { Job } from "./jobs";
import { jobsContext } from "./jobs/context";

describe("<DirectoryItem />", () => {
    function renderComponent(
        props: Partial<
            ContainerProps & {
                renameHook: () => Promise<void>;
                moveHook: () => Promise<void>;
                deleteHook: () => Promise<void>;
            }
        > = {
            renameHook: () => Promise.resolve(),
            moveHook: () => Promise.resolve(),
            deleteHook: () => Promise.resolve(),
        },
    ) {
        const defaultProps: ContainerProps = {
            oddRow: true,
            name: "Sample File.txt.exef",
            creation_time: 1577934245, // 2020-01-02 03:04:05
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
                        iconStyle: "default",
                        rowAlternatingColours: "normal",
                        fileSizeUnits: "si",
                        cryptoKeyStrength: 128,
                        cryptoChunkSize: 262144,
                        change: () => {},
                        save: () => Promise.resolve(),
                        checkUpdate: false,
                        checkUpdateInterval: 0,
                    }}
                >
                    <jobsContext.Provider
                        value={{
                            jobs: new Map(),
                            addJob: (_id: string, _job: Job) => {},
                            getJob: (_id: string) => {
                                return { id: _id, name: "", description: "", progress: 0, direction: "upload" };
                            },
                            updateJob: (_id: string, _newStatus: string, _newProgress?: number | null) => {},
                            updateProgress: (_id: string, _newProgress: number | null) => {},
                            cancelJob: (_id: string) => {},
                            deleteJob: (_id: string) => {},
                            clearComplete: () => {},
                        }}
                    >
                        <explorerContext.Provider
                            value={{
                                path: "/",
                                onRename: (_path, _isDir) => props.renameHook!(),
                                onMove: (_path) => props.moveHook!(),
                                onDelete: (_path, _isDir) => props.deleteHook!(),
                                presentAlert: () => Promise.resolve(),
                                dismissAlert: () => Promise.resolve(),
                                presentSnackbar: () => Promise.resolve(),
                            }}
                        >
                            <DirectoryItem id="directory-item" {...defaultProps} />
                        </explorerContext.Provider>
                    </jobsContext.Provider>
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
        cy.get("#directory-item ion-note").eq(0).should("have.text", "123.46 kB");

        // Correct creation time should be present
        cy.get("#directory-item ion-note").eq(1).should("have.text", "2020-01-02 03:04:05");
    });

    it("renders skeleton when pending", () => {
        renderComponent({ name: undefined, fullpath: undefined, type: undefined });

        cy.get("#directory-item").should("exist");
        cy.get("ion-skeleton-text").should("exist");
    });

    it("renders when disabled", () => {
        renderComponent({ disabled: true });
        cy.get("#directory-item ion-label").should("have.attr", "color", "light");
    });

    it("keeps the .exef extension if specified", () => {
        renderComponent({ keepExEF: true });
        cy.get("#directory-item ion-label").should("exist");
        cy.get("#directory-item ion-label").should("have.text", "Sample File.txt.exef");
    });

    it("has correct icon for defined MIME type", () => {
        renderComponent({ name: "Sample File.mp3.exef" });
        cy.get("#directory-item ion-icon").should("have.attr", "icon", musicalNotesOutline);
    });

    it("has correct default icon for undefined MIME type", () => {
        renderComponent({ name: "Sample File.fake-extension.exef" });
        cy.get("#directory-item ion-icon").should("have.attr", "icon", documentOutline);
    });

    it("calls rename hook when rename button is clicked", () => {
        const renameHook = cy.stub().resolves();
        renderComponent({ renameHook });
        cy.get("#directory-item .button").click();
        cy.get(".item").contains("Rename").click();
        cy.wrap(renameHook).should("have.been.called");
    });

    it("calls move hook when move button is clicked", () => {
        const moveHook = cy.stub().resolves();
        renderComponent({ moveHook });
        cy.get("#directory-item .button").click();
        cy.get(".item").contains("Move").click();
        cy.wrap(moveHook).should("have.been.called");
    });

    it("calls delete hook when delete button is clicked", () => {
        const deleteHook = cy.stub().resolves();
        renderComponent({ deleteHook });
        cy.get("#directory-item .button").click();
        cy.get(".item").contains("Delete").click();
        cy.wrap(deleteHook).should("have.been.called");
    });

    it("calls overridden click handler when provided", () => {
        const clickHook = cy.stub();
        renderComponent({ onClickItemOverride: clickHook });
        cy.get("#directory-item ion-grid").click();
        cy.wrap(clickHook).should("have.been.called");
    });
});
