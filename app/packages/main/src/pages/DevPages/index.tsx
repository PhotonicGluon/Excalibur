import React from "react";
import { Redirect, Route } from "react-router";

import ExEFPage from "./ExEFPage";
import TestPage from "./TestPage";

const DevPages: React.FC = () => {
    if (process.env.NODE_ENV !== "development") {
        return <Redirect from={location.pathname} to="/" />;
    }

    return (
        <>
            <Route path="/dev/test" component={TestPage} />
            <Route path="/dev/exef" component={ExEFPage} />
        </>
    );
};

export default DevPages;
