// Adapted from https://web.archive.org/web/20230320185219/https://usehooks.com/useAuth/
import { createContext, useContext, useState } from "react";

import { getToken } from "@lib/security/auth";

interface AuthProvider {
    /** The current authentication token */
    token: string | null;
    /** Function to authenticate with the server, returning the token */
    authenticate: (apiURL: string, uuid: string, key: Buffer) => Promise<string>;
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
    const [token, setToken] = useState<string | null>(null);

    const authenticate = async (apiURL: string, uuid: string, key: Buffer) => {
        const tokenResponse = await getToken(apiURL, uuid, key);
        if (!tokenResponse.success) {
            // TODO: Kick back to login screen
            return "";
        }

        setToken(tokenResponse.token!);
        return tokenResponse.token!;
    };

    return {
        token,
        authenticate,
    };
}
