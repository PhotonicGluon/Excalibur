import { useState } from "react";

import { heartbeat as _heartbeat } from "@root/src/lib/network";

import { getServerTime, getServerVersion } from "@lib/network";

import { AuthProvider, ServerInfo, authContext } from "./context";

const HEARTBEAT_INTERVAL = 15; // Interval between successful heartbeats, in seconds
const HEARTBEAT_RETRY_COUNT = 5; // Number of times to retry heartbeat on failure
const HEARTBEAT_RETRY_INTERVAL = 1; // Interval between retries, in seconds

/**
 * Heartbeat checking function.
 *
 * @param apiURL API URL
 * @param token Authentication token
 * @returns Whether the heartbeat was successful
 */
async function heartbeat(apiURL: string, token: string): Promise<boolean> {
    // Retry with intervals to make sure that the heartbeat is successful
    for (let i = 0; i < HEARTBEAT_RETRY_COUNT; i++) {
        const { success: connected, authValid: authenticated } = await _heartbeat(apiURL, token);
        if (authenticated === false) {
            return false;
        }
        if (connected && authenticated) {
            return true;
        }
        console.debug(`Heartbeat failed (${i + 1}/${HEARTBEAT_RETRY_COUNT})`);
        if (i !== HEARTBEAT_RETRY_COUNT - 1) {
            await new Promise((resolve) => setTimeout(resolve, HEARTBEAT_RETRY_INTERVAL * 1000));
        }
    }
    return false;
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

    const loginFunc = async (apiURL: string, token: string, e2eeKey: Buffer) => {
        // Set state variables
        setApiURL(apiURL);
        setE2EEKey(e2eeKey);
        setToken(token);

        // Get server info
        const versionResponse = await getServerVersion(apiURL);
        const timeResponse = await getServerTime(apiURL);
        if (!versionResponse.success || !timeResponse.success) {
            // Failed to retrieve info; kick back to login screen
            console.debug("Failed to retrieve info, sending back to login screen");
            window.location.href = "/login";
            return;
        }

        const serverVersion = versionResponse.version!;
        const serverTime = timeResponse.time!;
        const deltaTime = serverTime.getTime() - new Date().getTime();
        setServerInfo({ version: serverVersion, deltaTime });

        // Set up heartbeat interval
        const interval = setInterval(async () => {
            const connected = await heartbeat(apiURL, token);
            if (!connected) {
                // Heartbeat failed; kick back to login screen
                // TODO: Can we display a toast to inform the user why they were kicked back?
                console.debug("Heartbeat failed, sending back to login screen");
                window.location.href = "/login";
                return;
            }
        }, HEARTBEAT_INTERVAL * 1000);
        setHeartbeatInterval(interval);
    };

    const logoutFunc = async () => {
        // Stop checking for heartbeat
        clearInterval(heartbeatInterval!);

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
