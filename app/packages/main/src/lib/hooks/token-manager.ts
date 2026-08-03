import { useEffect, useState } from "react";

import { getNewToken } from "@lib/auth/api";
import { decodeJWT } from "@lib/auth/token";

import { useAuth } from "@components/auth/context";

const TOKEN_EARLY_REFRESH_THRESHOLD = 0.95; // 95% of token expiry then refresh
const TOKEN_EARLY_REFRESH_MIN_REQUEST_TIME = 5 * 1000; // 5 seconds

export function useTokenManager() {
    // Contexts
    const auth = useAuth();

    // States
    const [tokenTimeoutActive, setTokenTimeoutActive] = useState(false);

    // Effects
    useEffect(() => {
        if (tokenTimeoutActive || !auth.authInfo || !auth.serverInfo) {
            return;
        }

        // Get current token's expiry
        const { exp: expTimestamp } = decodeJWT<{ exp: number }>(auth.getToken()!);
        const tokenExpiry = new Date(expTimestamp * 1000).getTime() - new Date().getTime() - auth.authInfo!.timeOffset;

        // Compute refresh interval
        const refreshInterval = Math.min(
            tokenExpiry * TOKEN_EARLY_REFRESH_THRESHOLD, // Wait for threshold until sending request...
            tokenExpiry - TOKEN_EARLY_REFRESH_MIN_REQUEST_TIME, // or so that we have enough time to receive response
        );
        console.debug(`Token refresh interval is ${refreshInterval / 1000} s`);

        setTimeout(async () => {
            console.debug("Renewing token as it is expiring soon");
            const response = await getNewToken(auth);
            if (!response.success) {
                // I guess we fail silently...
                return;
            }

            auth.setAuthInfo({ ...auth.authInfo!, token: response.token! });
            console.log(`Renewed token; new token is ${response.token}`);
            setTokenTimeoutActive(false);
        }, refreshInterval);

        return () => setTokenTimeoutActive(true);
    }, [auth, tokenTimeoutActive]);
}
