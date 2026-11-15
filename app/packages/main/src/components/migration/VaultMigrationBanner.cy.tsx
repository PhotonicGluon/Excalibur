import { IonApp } from "@ionic/react";

import { KeyGenAlgorithm } from "@lib/crypto/keygen";
import { NameKeys } from "@lib/files/names/keys";
import { MerkleStatus } from "@lib/merkle";
import { MerkleKeys } from "@lib/merkle/keys";

import { authContext } from "@components/auth/context";
import { merkleContext } from "@components/merkle/context";

import VaultMigrationBanner from "./VaultMigrationBanner";
import { namesMigrationContext } from "./context";

interface RenderOptions {
    /** Status of the Merkle tree */
    status: MerkleStatus;
    /** Whether names still need encrypting */
    namesPending?: boolean;
    /** Called as the Merkle migration progresses */
    merkleSpy?: ((migratedCount: number, totalCount: number) => void) | null;
    /** Called as the names migration progresses */
    namesSpy?: ((migratedCount: number, totalCount: number) => void) | null;
    /** Called when the Merkle tree is synced */
    syncSpy?: (() => void) | null;
    merkleShouldFail?: boolean;
    namesShouldFail?: boolean;
}

describe("<VaultMigrationBanner />", () => {
    function renderComponent(options: RenderOptions) {
        return cy.mount(
            <IonApp>
                <authContext.Provider
                    value={{
                        authInfo: null,
                        serverInfo: {
                            apiURL: "",
                            version: "x.y.z", // Just need this for the test
                        },
                        vaultInfo: {
                            aukSalt: Buffer.alloc(0),
                            encryptedKey: Buffer.alloc(0),
                            key: Buffer.alloc(0),
                            keygenAlgorithm: KeyGenAlgorithm.PBKDF2,
                            merkleKeys: new MerkleKeys(Buffer.alloc(0), Buffer.alloc(0)),
                            nameKeys: new NameKeys(Buffer.alloc(0), Buffer.alloc(0)),
                            info: { obfuscatedNames: false },
                        },
                        noc: null,
                        getToken: () => null,
                        setAuthInfo: () => {},
                        setServerInfo: () => {},
                        setVaultInfo: () => {},
                        logout: () => Promise.resolve(),
                    }}
                >
                    <merkleContext.Provider
                        value={{
                            status: options.status,
                            busy: false,
                            lastSyncedAt: null,
                            refreshStatus: async () => {},
                            triggerSync: async () => {
                                options.syncSpy?.();
                                return { success: true };
                            },
                            migrate: async () => {
                                options.merkleSpy?.(1, 2);

                                if (options.merkleShouldFail) {
                                    return { success: false };
                                }

                                options.merkleSpy?.(3, 4);
                                return { success: true };
                            },
                        }}
                    >
                        <namesMigrationContext.Provider
                            value={{
                                pending: options.namesPending ?? false,
                                refreshPending: async () => {},
                                migrate: async () => {
                                    options.namesSpy?.(1, 2);

                                    if (options.namesShouldFail) {
                                        return { success: false, error: "Names failed" };
                                    }

                                    options.namesSpy?.(2, 2);
                                    return { success: true };
                                },
                            }}
                        >
                            <VaultMigrationBanner />
                        </namesMigrationContext.Provider>
                    </merkleContext.Provider>
                </authContext.Provider>
            </IonApp>,
        );
    }

    it("renders normally when only the Merkle tree needs upgrading", () => {
        renderComponent({ status: "none" });

        cy.get("ion-card").should("exist");
        cy.get("ion-card").contains("data integrity verification").should("exist");
        cy.get("ion-card").should("not.contain", "encrypt the names");
        cy.get("ion-button").contains("Later").should("exist");
        cy.get("ion-button").contains("Start Now").should("exist");
    });

    it("renders normally when only names need upgrading", () => {
        renderComponent({ status: "active", namesPending: true });

        cy.get("ion-card").should("exist");
        cy.get("ion-card").contains("encrypt the names").should("exist");
        cy.get("ion-card").should("not.contain", "data integrity verification");
    });

    it("mentions both upgrades if both are needed", () => {
        renderComponent({ status: "none", namesPending: true });

        cy.get("ion-card").contains("encrypt the names").should("exist");
        cy.get("ion-card").contains("data integrity verification").should("exist");
    });

    it('should alert that migration was interrupted if status is "migrating"', () => {
        renderComponent({ status: "migrating" });

        cy.get("ion-card").should("exist");
        cy.get("ion-card").contains("interrupted").should("exist");
    });

    it("should not appear if nothing needs upgrading", () => {
        renderComponent({ status: "active", namesPending: false });

        cy.get("ion-card").should("not.exist");
    });

    it("should not appear if the Merkle status is not known and names do not need upgrading", () => {
        renderComponent({ status: null as unknown as MerkleStatus });

        cy.get("ion-card").should("not.exist");
    });

    it('dismisses when "Later" is selected', () => {
        renderComponent({ status: "none" });

        cy.get("ion-card").should("exist");
        cy.get("ion-button").contains("Later").click();
        cy.get("ion-card").should("not.exist");
    });

    it('should only migrate the Merkle tree when "Start Now" is selected and only it is needed', () => {
        const merkleSpy = cy.stub().resolves();
        const namesSpy = cy.stub().resolves();
        renderComponent({ status: "none", merkleSpy, namesSpy });

        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(merkleSpy).should("have.been.calledWith", 1, 2);
        cy.wrap(merkleSpy).should("have.been.calledWith", 3, 4);
        cy.wrap(namesSpy).should("not.have.been.called");
    });

    it("should only migrate names, then sync, if the Merkle tree is already active", () => {
        const merkleSpy = cy.stub().resolves();
        const namesSpy = cy.stub().resolves();
        const syncSpy = cy.stub().resolves();
        renderComponent({ status: "active", namesPending: true, merkleSpy, namesSpy, syncSpy });

        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(namesSpy).should("have.been.calledWith", 2, 2);
        cy.wrap(syncSpy).should("have.been.called");
        cy.wrap(merkleSpy).should("not.have.been.called");
    });

    it("should migrate names before the Merkle tree if both are needed", () => {
        const merkleSpy = cy.stub().resolves();
        const namesSpy = cy.stub().resolves();
        renderComponent({ status: "none", namesPending: true, merkleSpy, namesSpy });

        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(namesSpy).should("have.been.calledWith", 2, 2);
        cy.wrap(merkleSpy).should("have.been.calledWith", 3, 4);
        cy.wrap(namesSpy).should("have.been.calledBefore", merkleSpy);
    });

    it("should show an error and skip the Merkle tree if names fail", () => {
        const merkleSpy = cy.stub().resolves();
        renderComponent({ status: "none", namesPending: true, merkleSpy, namesShouldFail: true });

        cy.get("ion-button").contains("Start Now").click();
        cy.get("ion-card").should("contain", "Names failed");
        cy.get("ion-button").contains("Retry").should("exist");
        cy.wrap(merkleSpy).should("not.have.been.called");
    });

    it("should show error if migration fails", () => {
        const merkleSpy = cy.stub().resolves();
        renderComponent({ status: "none", merkleSpy, merkleShouldFail: true });

        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(merkleSpy).should("have.been.calledWith", 1, 2);
        cy.wrap(merkleSpy).should("not.have.been.calledWith", 3, 4);
        cy.get("ion-card").should("contain", "Migration failed");
    });
});
