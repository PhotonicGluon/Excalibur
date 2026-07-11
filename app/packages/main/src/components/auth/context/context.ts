import { createContext, useContext } from "react";

import { E2EEData } from "@lib/auth/e2ee";
import { SubstitutionCipher } from "@lib/files/obfuscation";
import { VaultInfo } from "@lib/users/structures";

export interface AuthInfo extends E2EEData {
    username: string;
}

export interface ServerInfo {
    /** API URL */
    apiURL: string | null;
    /** Whether the API URL is fixed and cannot be changed */
    isFixed?: boolean;
    /** Server version */
    version: string;
    /** Maximum file size that can be uploaded, in bytes */
    maxUploadSize: number;
    /** Delta of time between server and client */
    deltaTime: number;
}

export interface AuthProvider {
    /** Authentication info, set upon login */
    authInfo: Omit<AuthInfo, "token"> | null;
    /** Server info, retrieved upon login */
    serverInfo: ServerInfo | null;
    /** Vault info, retrieved upon login */
    vaultInfo: VaultInfo | null;
    /** Name Obfuscation Cipher (NOC), which is derived from the vault key */
    noc: SubstitutionCipher | null;
    /** Retrieves the authentication token */
    getToken(): string | null;
    /** Set the authentication info */
    setAuthInfo: (authInfo: AuthInfo) => void;
    /** Set the server info */
    setServerInfo: (serverInfo: ServerInfo) => void;
    /** Set the vault info */
    setVaultInfo: (vaultInfo: VaultInfo) => void;
    /**
     * Function to log out of the server.
     *
     * @param full Whether to fully log out, including removing the saved API URL
     */
    logout: (full?: boolean) => Promise<void>;
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
