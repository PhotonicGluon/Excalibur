import { useState } from "react";

import { useEffectOnce, useMount } from "@lib/hooks";
import { checkAPIUrl, getServerInfo } from "@lib/network";
import { retrieveVaultKey } from "@lib/users/vault";

import { AuthInfo, AuthProvider, ServerInfo, authContext } from "./context";

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
    const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => {
        // Check if local storage has auth info
        const storedAuthInfo = localStorage.getItem("authInfo");
        if (!storedAuthInfo) {
            return null;
        }

        // Set context
        return deserializeAuthInfo(storedAuthInfo);
    });
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(() => {
        // Check if local storage has server info
        const storedServerInfo = localStorage.getItem("serverInfo");
        if (!storedServerInfo) {
            return null;
        }

        return JSON.parse(storedServerInfo);
    });
    const [vaultKey, setVaultKey] = useState<Buffer | null>(null);
    const [origVaultKey, setOrigVaultKey] = useState<Buffer | null>(null);

    // Handlers
    function getToken(): string | null {
        // Get token from local storage to ensure that token is up to date
        const storedAuthInfo = localStorage.getItem("authInfo");
        if (!storedAuthInfo) {
            return null;
        }
        return deserializeAuthInfo(storedAuthInfo).token;
    }

    function setAuthInfoFunc(authInfo: AuthInfo) {
        setAuthInfo(authInfo);
        localStorage.setItem("authInfo", serializeAuthInfo(authInfo));
    }

    function setServerInfoFunc(serverInfo: ServerInfo) {
        setServerInfo(serverInfo);
        localStorage.setItem("serverInfo", JSON.stringify(serverInfo));
    }

    async function loginFunc(authInfo: AuthInfo) {
        // Update state
        setAuthInfo(authInfo);
        setVaultKey(vaultKey);
        setOrigVaultKey(vaultKey);

        // Save to local storage
        localStorage.setItem("authInfo", serializeAuthInfo(authInfo));
    }

    async function logoutFunc(full: boolean = false) {
        if (full) {
            setServerInfo(null);
            localStorage.removeItem("serverInfo");
        }

        setAuthInfo(null);
        localStorage.removeItem("authInfo");

        setVaultKey(null);
        setOrigVaultKey(null);
    }

    // Effects
    useEffectOnce(() => {
        if (!serverInfo) {
            return;
        }

        // Is server valid?
        checkAPIUrl(serverInfo.apiURL!).then((result) => {
            if (!result.reachable || !result.valid || !result.compatible) {
                console.debug(`Server '${serverInfo.apiURL}' is not valid; going back to welcome screen`);
                logoutFunc(true);
                return;
            }

            // Get latest server info
            getServerInfo(serverInfo.apiURL!).then((info) => {
                if (info) {
                    const newServerInfo = {
                        ...serverInfo,
                        version: info.version!,
                        maxUploadSize: info.maxUploadSize!,
                        deltaTime: info.time!.getTime() - new Date().getTime(),
                    };
                    setServerInfoFunc(newServerInfo);
                }
            });
        });
    });

    useMount(() => {
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
    });

    // Return data
    return {
        authInfo: authInfo!,
        serverInfo: serverInfo!,
        vaultKey: vaultKey!,
        origVaultKey: origVaultKey!,
        getToken: getToken,
        setAuthInfo: setAuthInfoFunc,
        setServerInfo: setServerInfoFunc,
        login: loginFunc,
        logout: logoutFunc,
        setVaultKey: (vaultKey: Buffer) => setVaultKey(vaultKey),
    };
}

function serializeAuthInfo(data: AuthInfo) {
    return JSON.stringify({
        key: data.key.toString("hex"),
        token: data.token,
        auk: data.auk.toString("hex"),
        obfuscatedNames: data.obfuscatedNames,
        username: data.username,
    });
}

function deserializeAuthInfo(data: string): AuthInfo {
    const parsed = JSON.parse(data);
    return {
        key: Buffer.from(parsed.key, "hex"),
        token: parsed.token,
        auk: Buffer.from(parsed.auk, "hex"),
        obfuscatedNames: parsed.obfuscatedNames,
        username: parsed.username,
    };
}
