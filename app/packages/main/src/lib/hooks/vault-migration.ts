import { useState } from "react";

import { useMerkle } from "@components/merkle/context";
import { useNamesMigration } from "@components/migration/context";

/** A step of the vault migration. */
export type MigrationStep = "names" | "merkle";

/** Progress through the vault migration. */
export interface MigrationProgress {
    /** The step being worked on */
    step: MigrationStep;
    /** Position of the step among the steps that apply (starting at 1) */
    stepNumber: number;
    /** Number of steps that apply */
    stepCount: number;
    /** Description of what the step is currently doing, if known */
    phase: string | null;
    /** Number of items that the step has finished, or `null` if not known yet */
    migrated: number | null;
    /** Number of items that the step has to handle, or `null` if not known yet */
    total: number | null;
}

/**
 * React hook that combines the upgrades that a vault may need (encrypting names and building the
 * Merkle tree) into one migration.
 *
 * Names are done first, so that the Merkle tree is built from the final names.
 *
 * @returns Object containing which steps the vault needs, the progress so far, and a function to
 *      run the migration
 */
export function useVaultMigration(): {
    needsNames: boolean;
    needsMerkle: boolean;
    interrupted: boolean;
    running: boolean;
    progress: MigrationProgress | null;
    error: string | null;
    run: () => Promise<{ success: boolean; error?: string }>;
} {
    // Contexts
    const merkle = useMerkle();
    const namesMigration = useNamesMigration();

    // States
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState<MigrationProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const needsNames = namesMigration.pending === true;
    const needsMerkle = merkle.status === "none" || merkle.status === "migrating";

    // Functions
    /**
     * Runs the steps that the vault needs.
     *
     * @returns a promise which resolves to an object with a success boolean and optionally an error
     *      message
     */
    async function run(): Promise<{ success: boolean; error?: string }> {
        const steps: MigrationStep[] = [];
        if (needsNames) steps.push("names");
        if (needsMerkle) steps.push("merkle");

        function startStep(step: MigrationStep): MigrationProgress {
            const current: MigrationProgress = {
                step,
                stepNumber: steps.indexOf(step) + 1,
                stepCount: steps.length,
                phase: null,
                migrated: null,
                total: null,
            };
            setProgress(current);
            return current;
        }

        function fail(message: string): { success: boolean; error: string } {
            setError(message);
            setRunning(false);
            setProgress(null);
            return { success: false, error: message };
        }

        setError(null);
        setRunning(true);

        // Encrypt names first
        if (needsNames) {
            const current = startStep("names");
            const result = await namesMigration.migrate((migrated, total) =>
                setProgress({ ...current, migrated, total }),
            );
            if (!result.success) {
                return fail(result.error ?? "Failed to encrypt names");
            }
        }

        if (needsMerkle) {
            // The Merkle tree is built from the (now encrypted) names
            const current = startStep("merkle");
            const result = await merkle.migrate(
                (phase) => setProgress((prev) => ({ ...(prev ?? current), phase })),
                (migrated, total) => setProgress((prev) => ({ ...(prev ?? current), migrated, total })),
            );
            if (!result.success) {
                return fail(result.error ?? "Migration failed");
            }
        } else if (needsNames && merkle.status === "active") {
            // The renamed items have to be re-hashed
            const result = await merkle.triggerSync();
            if (!result.success) {
                return fail(result.error ?? "Failed to sync the integrity tree");
            }
        }

        setRunning(false);
        setProgress(null);
        return { success: true };
    }

    return {
        needsNames,
        needsMerkle,
        interrupted: merkle.status === "migrating" && !running && !merkle.busy,
        running,
        progress,
        error,
        run,
    };
}
