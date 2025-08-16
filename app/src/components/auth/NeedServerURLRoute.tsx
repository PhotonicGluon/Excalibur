import React from "react";
import { Redirect, Route, RouteProps, useLocation } from "react-router";

import { useAuth } from "@contexts/auth";

/**
 * A wrapper for <Route> that redirects to the login page if not authenticated.
 */
const NeedServerURLRoute: React.FC<RouteProps> = ({ children, ...rest }) => {
    const auth = useAuth();
    const location = useLocation();
    return (
        <Route {...rest}>{auth.apiURL ? children : <Redirect from={location.pathname} to="/server-choice" />}</Route>
    );
};

export default NeedServerURLRoute;
