import { useState } from "react";

import { VaultProvider, vaultContext } from "./context";

export const ProvideVault: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const vault = useProvideVault();
    return <vaultContext.Provider value={vault}>{children}</vaultContext.Provider>;
};

/**
 * Hook to provide the vault state to the app.
 *
 * @returns An object with the vault state
 */
function useProvideVault(): VaultProvider {
    const [key, setKey] = useState<Buffer | null>(null);

    return {
        key,
        setKey,
    };
}
