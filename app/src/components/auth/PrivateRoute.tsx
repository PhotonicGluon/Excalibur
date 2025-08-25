import React from "react";
import { Redirect, RouteProps, useLocation } from "react-router";

import NeedServerURLRoute from "@components/auth/NeedServerURLRoute";
import { useAuth } from "@components/auth/context";

/**
 * A wrapper for <Route> that redirects to the login page if not authenticated.
 */
const PrivateRoute: React.FC<RouteProps> = ({ children, ...rest }) => {
    const auth = useAuth();
    const location = useLocation();
    return (
        <NeedServerURLRoute {...rest}>
            {auth.authInfo?.token ? children : <Redirect from={location.pathname} to="/login" />}
        </NeedServerURLRoute>
    );
};

export default PrivateRoute;
