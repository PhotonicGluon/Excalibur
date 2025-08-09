import { createContext, useContext } from "react";

import { E2EEData } from "@lib/security/e2ee";

// TODO: Just make this interface extend `E2EEData`
export interface AuthInfo {
    /** API URL */
    apiURL: string;
    /** Username */
    username: string;
    /** End-to-end encryption data */
    e2eeData: E2EEData;
}

export interface ServerInfo {
    /** Server version */
    version: string;
    /** Delta of time between server and client */
    deltaTime: number;
}

export interface AuthProvider {
    /** Authentication info, set upon login */
    authInfo: AuthInfo | null;
    /** Server info, retrieved upon login */
    serverInfo: ServerInfo | null;
    /** Vault key, retrieved upon login */
    vaultKey: Buffer | null;
    /** Function to log into the server */
    login: (apiURL: string, username: string, e2eeData: E2EEData) => Promise<void>;
    /** Function to log out of the server */
    logout: () => Promise<void>;
    /** Function to set the vault key */
    setVaultKey: (vaultKey: Buffer) => void;
}

export const authContext = createContext<AuthProvider>(null!);

/**
 * Hook to get the current authentication state.
 *
 * @returns The current authentication state.
 */
export function useAuth(): AuthProvider {
    return useContext(authContext);
}
