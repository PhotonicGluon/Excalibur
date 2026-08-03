import { useRef, useState } from "react";

import HKDF from "@lib/crypto/hkdf";
import { SubstitutionCipher } from "@lib/files/obfuscation";
import { useEffectOnce } from "@lib/hooks";
import { checkAPIUrl, getServerVersion } from "@lib/network";
import { VaultInfo } from "@lib/users/structures";

import { AuthInfo, AuthProvider, ServerInfo, authContext } from "./context";

export const ProvideAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useProvideAuth();
    return <authContext.Provider value={auth}>{children}</authContext.Provider>;
};

/**
 * Hook to provide the authentication state to the app.
 *
 * @returns an object with the authentication data
 */
function useProvideAuth(): AuthProvider {
    // States
    const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(() => {
        // Check if local storage has server info
        const storedServerInfo = localStorage.getItem("serverInfo");
        if (!storedServerInfo) {
            return null;
        }

        return JSON.parse(storedServerInfo);
    });
    const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);

    const noc = vaultInfo
        ? new SubstitutionCipher(
              new HKDF("sha256").hkdf(vaultInfo.key, null, Buffer.from("Name Obfuscation Cipher"), 32),
          )
        : null;

    // References
    const authInfoRef = useRef<AuthInfo | null>(null);

    // Handlers
    function getToken(): string | null {
        return authInfoRef.current?.token ?? null;
    }

    function setAuthInfoFunc(authInfo: AuthInfo) {
        authInfoRef.current = authInfo;
        setAuthInfo(authInfo);
    }

    function setServerInfoFunc(serverInfo: ServerInfo) {
        setServerInfo(serverInfo);
        localStorage.setItem("serverInfo", JSON.stringify(serverInfo));
    }

    function setVaultInfoFunc(vaultInfo: VaultInfo) {
        setVaultInfo(vaultInfo);
    }

    async function logoutFunc(full: boolean = false) {
        if (full) {
            setServerInfo(null);
            localStorage.removeItem("serverInfo");
        }

        authInfoRef.current = null;
        setAuthInfo(null);
        setVaultInfo(null);
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

            // // Get latest server info
            // getServerInfo(serverInfo.apiURL!).then((info) => {
            //     if (info) {
            //         const newServerInfo = {
            //             ...serverInfo,
            //             version: info.version!,
            //             maxUploadSize: info.maxUploadSize!,
            //             deltaTime: info.time!.getTime() - new Date().getTime(),
            //         };
            //         setServerInfoFunc(newServerInfo);
            //     }
            // });

            // Get latest server version
            getServerVersion(serverInfo.apiURL!).then((result) => {
                if (result && result.success) {
                    const newServerInfo = {
                        ...serverInfo,
                        version: result.version!,
                        // TODO: Get these values
                        maxUploadSize: 52_428_800, // 50 MB
                        deltaTime: 0,
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
