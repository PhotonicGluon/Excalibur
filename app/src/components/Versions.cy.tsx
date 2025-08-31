import { IonApp } from "@ionic/react";
import packageInfo from "@root/package.json";

import { authContext } from "@components/auth/context";

import Versions from "./Versions";

describe("<Versions />", () => {
    function renderComponent() {
        return cy.mount(
            <IonApp>
                <authContext.Provider
                    value={{
                        authInfo: null,
                        serverInfo: {
                            apiURL: "",
                            version: "x.y.z", // Just need this for the test
                            deltaTime: 0,
                        },
                        vaultKey: null,
                        origVaultKey: null,
                        setServerInfo: () => {},
                        setVaultKey: () => {},
                        login: (_a, _b) => Promise.resolve(),
                        logout: () => Promise.resolve(),
                    }}
                >
                    <Versions id="versions" />
                </authContext.Provider>
            </IonApp>,
        );
    }

    it("renders correctly", () => {
        renderComponent();

        cy.get("#versions").should("exist");
        cy.get("#versions").should("contain.text", `App version: ${packageInfo.version}`);
        cy.get("#versions").should("contain.text", "Server version: x.y.z");
    });
});
