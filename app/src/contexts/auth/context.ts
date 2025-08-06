import { createContext, useContext } from "react";

export interface AuthInfo {
    /** API URL */
    apiURL: string;
    /** Key used for end-to-end encryption */
    e2eeKey: Buffer;
    /** The current authentication token */
    token: string;
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
    /** Function to log into the server */
    login: (apiURL: string, token: string, e2eeKey: Buffer) => Promise<void>;
    /** Function to log out of the server */
    logout: () => Promise<void>;
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
