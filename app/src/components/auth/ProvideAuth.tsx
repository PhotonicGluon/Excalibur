// Adapted from https://web.archive.org/web/20230320185219/https://usehooks.com/useAuth/
import { Dispatch, SetStateAction, createContext, useContext, useState } from "react";

import { getServerTime, getServerVersion, heartbeat } from "@lib/network";
import { login, logout } from "@lib/security/api";

interface ServerInfo {
    /** Server version*/
    version: string;
    /** Time of login, as an ISO 8601 string */
    loginTime: string;
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
    /** Function to log into the server, returning the token for continued authentication */
    login: (apiURL: string, uuid: string, e2eeKey: Buffer) => Promise<string>;
    /** Function to log out of the server */
    logout: () => Promise<void>;
    /** Function to set the vault key */
    setVaultKey: Dispatch<SetStateAction<Buffer<ArrayBufferLike> | null>>;
}

const authContext = createContext<AuthProvider>(null!);

/**
 * Hook to get the current authentication state.
 *
 * @returns The current authentication state.
 */
export function useAuth() {
    return useContext(authContext);
}

/**
 * A component that provides the authentication state to the rest of the app.
 *
 * @remarks This component wraps the entire app and provides the authentication state to all
 *      components via the `useAuth` hook.
 *
 * @example
 * function App() {
 *     return (
 *         <ProvideAuth>
 *             <Routes />
 *         </ProvideAuth>
 *     );
 * }
 */
export const ProvideAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useProvideAuth();
    return <authContext.Provider value={auth}>{children}</authContext.Provider>;
};

/**
 * Hook to provide the authentication state to the app.
 *
 * @returns An object with the current authentication token and a function to authenticate
 *      with the server.
 */
function useProvideAuth(): AuthProvider {
    const [apiURL, setApiURL] = useState<string | null>(null);
    const [e2eeKey, setE2EEKey] = useState<Buffer | null>(null);
    const [vaultKey, setVaultKey] = useState<Buffer | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

    const loginFunc = async (apiURL: string, uuid: string, e2eeKey: Buffer) => {
        // Set state variables
        setApiURL(apiURL);
        setE2EEKey(e2eeKey);

        // Login to the server, getting the access token and server info
        const tokenResponse = await login(apiURL, uuid, e2eeKey);
        const versionResponse = await getServerVersion(apiURL);
        const timeResponse = await getServerTime(apiURL);
        if (!tokenResponse.success || !versionResponse.success || !timeResponse.success) {
            // Failed to log in; kick back to login screen
            console.debug("Failed to log in and retrieve info, sending back to login screen");
            window.location.href = "/login";
            return "";
        }
        const token = tokenResponse.token!;
        const serverVersion = versionResponse.version!;
        const serverTime = timeResponse.time!;
        setToken(token);
        setServerInfo({ version: serverVersion, loginTime: serverTime });

        // Set up heartbeat interval
        const interval = setInterval(async () => {
            const heartbeatResponse = await heartbeat(apiURL, token);
            if (!heartbeatResponse.success || !heartbeatResponse.authValid) {
                // Heartbeat failed; kick back to login screen
                console.debug("Heartbeat failed, sending back to login screen");
                window.location.href = "/login";
                return;
            }
        }, 30_000); // 30 s
        setHeartbeatInterval(interval);
        return token;
    };

    const logoutFunc = async () => {
        // Stop checking for heartbeat
        clearInterval(heartbeatInterval!);

        // Logout
        const logoutResponse = await logout(apiURL!, token!);
        if (!logoutResponse.success) {
            // Logout failed; kick back to login screen
            console.debug("Logout failed, sending back to login screen");
            window.location.href = "/login";
            return;
        }

        // Clear state
        setApiURL(null);
        setE2EEKey(null);
        setVaultKey(null);
        setServerInfo(null);
        setToken(null);
    };

    return {
        apiURL,
        e2eeKey,
        vaultKey,
        token,
        serverInfo,
        login: loginFunc,
        logout: logoutFunc,
        setVaultKey,
    };
}
