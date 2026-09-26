import { IonApp } from "@ionic/react";

import { MerkleStatus } from "@lib/merkle";

import MerkleMigrationBanner from "./MerkleMigrationBanner";
import { merkleContext } from "./context";

describe("<MerkleMigrationBanner />", () => {
    function renderComponent(
        status: MerkleStatus,
        migrateSpy?: ((migratedCount: number, totalCount: number) => void) | null,
        migrateShouldFail?: boolean,
    ) {
        return cy.mount(
            <IonApp>
                <merkleContext.Provider
                    value={{
                        status,
                        busy: false,
                        lastSyncedAt: null,
                        refreshStatus: async () => {},
                        triggerSync: async () => ({ success: true }),
                        migrate: async () => {
                            migrateSpy?.(1, 2);

                            if (migrateShouldFail) {
                                return { success: false };
                            }

                            migrateSpy?.(3, 4);
                            return { success: true };
                        },
                    }}
                >
                    <MerkleMigrationBanner />
                </merkleContext.Provider>
            </IonApp>,
        );
    }

    it('renders normally with status "none"', () => {
        renderComponent("none");

        cy.get("ion-card").should("exist");
        cy.get("ion-button").contains("Later").should("exist");
        cy.get("ion-button").contains("Start Now").should("exist");
    });

    it('should alert that migration was interrupted if status is "migrating"', () => {
        renderComponent("migrating");

        cy.get("ion-card").should("exist");
        cy.get("ion-card").contains("interrupted").should("exist");
    });

    it('should not appear if status is "active"', () => {
        renderComponent("active");

        cy.get("ion-card").should("not.exist");
    });

    it('dismisses when "Later" is selected', () => {
        renderComponent("none");

        cy.get("ion-card").should("exist");
        cy.get("ion-button").contains("Later").click();
        cy.get("ion-card").should("not.exist");
    });

    it('should call `migrate()` when "Start Now" is selected', () => {
        const migrateSpy = cy.stub().resolves();
        renderComponent("none", migrateSpy);

        cy.get("ion-card").should("exist");
        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(migrateSpy).should("have.been.calledWith", 1, 2);
        cy.wrap(migrateSpy).should("have.been.calledWith", 3, 4);
    });

    it("should show error if migration fails", () => {
        const migrateSpy = cy.stub().resolves();
        renderComponent("none", migrateSpy, true);

        cy.get("ion-card").should("exist");
        cy.get("ion-button").contains("Start Now").click();
        cy.wrap(migrateSpy).should("have.been.calledWith", 1, 2);
        cy.wrap(migrateSpy).should("not.have.been.calledWith", 3, 4);
        cy.get("ion-card").should("contain", "Migration failed");
    });
});
