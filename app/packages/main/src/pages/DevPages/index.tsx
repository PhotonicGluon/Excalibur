import React from "react";
import { Redirect, Route } from "react-router";

import { IS_DEV } from "@lib/util";

import CryptoBenchPage from "./CryptoBenchPage";
import ExEFPage from "./ExEFPage";
import TestPage from "./TestPage";

const DevPages: React.FC = () => {
    if (!IS_DEV) {
        return <Redirect from={location.pathname} to="/" />;
    }

    return (
        <>
            <Route path="/dev/test" component={TestPage} />
            <Route path="/dev/exef" component={ExEFPage} />
            <Route path="/dev/crypto" component={CryptoBenchPage} />
        </>
    );
};

export default DevPages;
