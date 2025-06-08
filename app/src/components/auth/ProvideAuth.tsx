// Adapted from https://web.archive.org/web/20230320185219/https://usehooks.com/useAuth/
import { createContext, useContext, useState } from "react";

import { login, logout } from "@lib/security/api";

export interface AuthProvider {
    /** API URL */
    apiURL: string | null;
    /** Master key used for communication */
    masterKey: Buffer | null;
    /** The current authentication token */
    token: string | null;
    /** Function to log into the server, returning the token for continued authentication */
    login: (apiURL: string, uuid: string, key: Buffer) => Promise<string>;
    /** Function to log out of the server */
    logout: () => Promise<void>;
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
    const [masterKey, setMasterKey] = useState<Buffer | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const loginFunc = async (apiURL: string, uuid: string, key: Buffer) => {
        const tokenResponse = await login(apiURL, uuid, key);
        if (!tokenResponse.success) {
            // TODO: Kick back to login screen
            return "";
        }

        setApiURL(apiURL);
        setMasterKey(key);
        setToken(tokenResponse.token!);
        return tokenResponse.token!;
    };

    const logoutFunc = async () => {
        const logoutResponse = await logout(apiURL!, token!);
        if (!logoutResponse.success) {
            // TODO: What to do here?
            return;
        }

        setApiURL(null);
        setMasterKey(null);
        setToken(null);
    };

    return {
        apiURL,
        masterKey,
        token,
        login: loginFunc,
        logout: logoutFunc,
    };
}
