import { useState } from "react";

import HKDF from "@lib/crypto/hkdf";
import { SubstitutionCipher } from "@lib/files/obfuscation";
import { useEffectOnce } from "@lib/hooks";
import { checkAPIUrl, getServerInfo } from "@lib/network";
import { VaultInfo } from "@lib/users/structures";

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
    const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(() => {
        // Check if local storage has vault info
        const storedVaultInfo = localStorage.getItem("vaultInfo");
        if (!storedVaultInfo) {
            return null;
        }

        return deserializeVaultInfo(storedVaultInfo);
    });

    const noc = vaultInfo
        ? new SubstitutionCipher(
              new HKDF("sha256").hkdf(vaultInfo.key, null, Buffer.from("Name Obfuscation Cipher"), 32),
          )
        : null;

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

    function setVaultInfoFunc(vaultInfo: VaultInfo) {
        setVaultInfo(vaultInfo);
        localStorage.setItem("vaultInfo", serializeVaultInfo(vaultInfo));
    }

    async function logoutFunc(full: boolean = false) {
        if (full) {
            setServerInfo(null);
            localStorage.removeItem("serverInfo");
        }

        setAuthInfo(null);
        setVaultInfo(null);
        localStorage.removeItem("authInfo");
        localStorage.removeItem("vaultInfo");
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

    // Return data
    return {
        authInfo: authInfo!,
        serverInfo: serverInfo!,
        vaultInfo: vaultInfo!,
        noc: noc!,
        getToken: getToken,
        setAuthInfo: setAuthInfoFunc,
        setServerInfo: setServerInfoFunc,
        setVaultInfo: setVaultInfoFunc,
        logout: logoutFunc,
    };
}

function serializeAuthInfo(data: AuthInfo): string {
    return JSON.stringify({
        key: data.key.toString("hex"),
        token: data.token,
        username: data.username,
    });
}

function deserializeAuthInfo(data: string): AuthInfo {
    const parsed = JSON.parse(data);
    return {
        key: Buffer.from(parsed.key, "hex"),
        token: parsed.token,
        username: parsed.username,
    };
}

function serializeVaultInfo(data: VaultInfo): string {
    return JSON.stringify({
        keygenAlgorithm: data.keygenAlgorithm,
        aukSalt: data.aukSalt.toString("hex"),
        auk: data.auk.toString("hex"),
        key: data.key.toString("hex"),
        info: JSON.stringify(data.info),
    });
}

function deserializeVaultInfo(data: string): VaultInfo {
    const parsed = JSON.parse(data);
    return {
        keygenAlgorithm: parsed.keygenAlgorithm,
        aukSalt: Buffer.from(parsed.aukSalt, "hex"),
        auk: Buffer.from(parsed.auk, "hex"),
        key: Buffer.from(parsed.key, "hex"),
        info: JSON.parse(parsed.info),
    };
}
