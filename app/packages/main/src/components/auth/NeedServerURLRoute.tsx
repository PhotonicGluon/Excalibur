import React from "react";
import { Redirect, Route, RouteProps, useLocation } from "react-router";

import { useAuth } from "@components/auth/context";

/**
 * A wrapper for <Route> that redirects to the login page if not authenticated.
 */
const NeedServerURLRoute: React.FC<RouteProps> = ({ children, ...routeProps }) => {
    // Contexts
    const auth = useAuth();
    const location = useLocation();

    // Render
    return (
        <Route {...routeProps}>
            {auth.serverInfo !== null ? children : <Redirect from={location.pathname} to="/server-choice" />}
        </Route>
    );
};

export default NeedServerURLRoute;
