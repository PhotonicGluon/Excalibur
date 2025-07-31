import { Dispatch, SetStateAction, createContext, useContext } from "react";

export interface ServerInfo {
    /** Server version*/
    version: string;
    /** Delta of time between server and client */
    deltaTime: number;
}

export interface AuthProvider {
    /** API URL */
    apiURL: string | null;
    /** Key used for end-to-end encryption */
    e2eeKey: Buffer | null;
    /** Key used to encrypt data in the vault */
    vaultKey: Buffer | null;
    /** The current authentication token */
    token: string | null;
    /** Server info, retrieved upon login */
    serverInfo: ServerInfo | null;
    /** Function to log into the server */
    login: (apiURL: string, token: string, e2eeKey: Buffer) => Promise<void>;
    /** Function to log out of the server */
    logout: () => Promise<void>;
    /** Function to set the vault key */
    setVaultKey: Dispatch<SetStateAction<Buffer<ArrayBufferLike> | null>>;
}

export const authContext = createContext<AuthProvider>(null!);

/**
 * Hook to get the current authentication state.
 *
 * @returns The current authentication state.
 */
export function useAuth() {
    return useContext(authContext);
}
