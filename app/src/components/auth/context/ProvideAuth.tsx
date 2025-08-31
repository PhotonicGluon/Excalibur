import { useCallback, useEffect, useState } from "react";

import { heartbeat as _heartbeat, checkAPIUrl } from "@lib/network";
import { retrieveVaultKey } from "@lib/users/vault";

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
    const [vaultKey, setVaultKey] = useState<Buffer | null>(null);
    const [origVaultKey, setOrigVaultKey] = useState<Buffer | null>(null);
    const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

    // Handlers
    function setServerInfoFunc(serverInfo: ServerInfo) {
        setServerInfo(serverInfo);
        localStorage.setItem("serverInfo", JSON.stringify(serverInfo));
    }

    async function loginFunc(apiURL: string, authInfo: AuthInfo) {
        // Set up heartbeat interval
        const interval = setInterval(async () => {
            const connected = await heartbeat(apiURL!, authInfo.token);
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
        setAuthInfo(authInfo);
        setVaultKey(vaultKey);
        setOrigVaultKey(vaultKey);

        // Save to local storage
        localStorage.setItem("authInfo", serializeAuthInfo(authInfo));
    }

    const logoutFunc = useCallback(
        async (full: boolean = false) => {
            clearInterval(heartbeatInterval!);

            if (full) {
                setServerInfo(null);
                localStorage.removeItem("serverInfo");
            }

            setAuthInfo(null);
            localStorage.removeItem("authInfo");

            setVaultKey(null);
            setOrigVaultKey(null);
        },
        [heartbeatInterval],
    );

    // Effects
    useEffect(() => {
        // Check if local storage has server info
        const storedServerInfo = localStorage.getItem("serverInfo");
        if (!storedServerInfo) {
            return;
        }

        // Set context
        const serverInfo: ServerInfo = JSON.parse(storedServerInfo);
        setServerInfo(serverInfo);

        // Is server valid?
        checkAPIUrl(serverInfo.apiURL!).then((result) => {
            if (!result.reachable || !result.valid || !result.compatible) {
                console.debug(`Server '${serverInfo.apiURL}' is not valid; going back to welcome screen`);
                logoutFunc(true);
                return;
            }
        });
    }, [logoutFunc]);

    useEffect(() => {
        // Check if local storage has auth info
        const storedAuthInfo = localStorage.getItem("authInfo");
        if (!storedAuthInfo) {
            return;
        }

        // Set context
        const authInfo = deserializeAuthInfo(storedAuthInfo);
        setAuthInfo(authInfo);
    }, []);

    useEffect(() => {
        if (!authInfo || !serverInfo) {
            return;
        }

        // Get vault key
        retrieveVaultKey(serverInfo.apiURL!, authInfo, (error) => {
            console.error(error);
        }).then((resp) => {
            if (!resp) {
                console.error("Failed to retrieve vault key");
                return;
            }
            setVaultKey(resp);
            setOrigVaultKey(resp);
        });
    }, [authInfo, serverInfo]);

    // Return data
    return {
        authInfo: authInfo!,
        serverInfo: serverInfo!,
        vaultKey: vaultKey!,
        origVaultKey: origVaultKey!,
        setServerInfo: setServerInfoFunc,
        login: loginFunc,
        logout: logoutFunc,
        setVaultKey: (vaultKey: Buffer) => setVaultKey(vaultKey),
    };
}

function serializeAuthInfo(data: AuthInfo) {
    return JSON.stringify({
        username: data.username,
        key: data.key.toString("hex"),
        auk: data.auk.toString("hex"),
        token: data.token,
    });
}

function deserializeAuthInfo(data: string): AuthInfo {
    const parsed = JSON.parse(data);
    return {
        username: parsed.username,
        key: Buffer.from(parsed.key, "hex"),
        auk: Buffer.from(parsed.auk, "hex"),
        token: parsed.token,
    };
}
