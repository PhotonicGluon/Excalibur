import React from "react";
import { Redirect, Route, RouteProps, useLocation } from "react-router";

import { useAuth } from "@components/auth/ProvideAuth";

/**
 * A wrapper for <Route> that redirects to the login page if not authenticated.
 */
export const PrivateRoute: React.FC<RouteProps> = ({ children, ...rest }) => {
    const auth = useAuth();
    const location = useLocation();
    return <Route {...rest}>{auth.token ? children : <Redirect from={location.pathname} to="/login" />}</Route>;
};
