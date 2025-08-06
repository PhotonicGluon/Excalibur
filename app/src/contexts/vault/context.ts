import { Dispatch, SetStateAction, createContext, useContext } from "react";

export interface VaultProvider {
    /** Key used to encrypt data in the vault */
    key: Buffer | null;
    /** Function to set the vault key */
    setKey: Dispatch<SetStateAction<Buffer<ArrayBufferLike> | null>>;
}

export const vaultContext = createContext<VaultProvider>(null!);

/**
 * Hook to get the current vault state.
 *
 * @returns The current vault state.
 */
export function useVault(): VaultProvider {
    return useContext(vaultContext);
}
