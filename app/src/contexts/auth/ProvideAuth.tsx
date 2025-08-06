import { useState } from "react";

import { heartbeat as _heartbeat, getServerTime, getServerVersion } from "@lib/network";
import { E2EEData } from "@lib/security/e2ee";

import { AuthInfo, AuthProvider, ServerInfo, authContext } from "./context";

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

export const ProvideAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useProvideAuth();
    return <authContext.Provider value={auth}>{children}</authContext.Provider>;
};

/**
 * Hook to provide the authentication state to the app.
 *
 * @returns An object with the authentication data
 */
function useProvideAuth(): AuthProvider {
    // States
    const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

    // Handlers
    async function loginFunc(apiURL: string, e2eeData: E2EEData) {
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

        // Set up heartbeat interval
        const interval = setInterval(async () => {
            const connected = await heartbeat(apiURL, e2eeData.token);
            if (!connected) {
                // Heartbeat failed; kick back to login screen
                // TODO: Can we display a toast to inform the user why they were kicked back?
                console.debug("Heartbeat failed, sending back to login screen");
                window.location.href = "/login";
                return;
            }
        }, HEARTBEAT_INTERVAL * 1000);
        setHeartbeatInterval(interval);

        // Update state
        const authInfo = { apiURL, e2eeData };
        const serverInfo = { version: serverVersion, deltaTime };
        setAuthInfo(authInfo);
        setServerInfo(serverInfo);
    }

    async function logoutFunc() {
        // Stop checking for heartbeat
        clearInterval(heartbeatInterval!);

        // Clear state
        setAuthInfo(null);
        setServerInfo(null);

    }

    // Return data
    return {
        authInfo: authInfo!,
        serverInfo: serverInfo!,
        login: loginFunc,
        logout: logoutFunc,
    };
}
