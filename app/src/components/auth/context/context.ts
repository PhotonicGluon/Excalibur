import { createContext, useContext } from "react";

import { E2EEData } from "@lib/security/e2ee";

export interface AuthInfo extends E2EEData {
    /** Username */
    username?: string;
}

export interface ServerInfo {
    /** API URL */
    apiURL: string | null;
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
    /** Set the server info */
    setServerInfo: (serverInfo: ServerInfo) => void;
    /** Function to log into the server */
    login: (apiURL: string, authInfo: AuthInfo) => Promise<void>;
    /**
     * Function to log out of the server.
     *
     * @param full Whether to fully log out, including removing the saved API URL
     */
    logout: (full?: boolean) => Promise<void>;
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
