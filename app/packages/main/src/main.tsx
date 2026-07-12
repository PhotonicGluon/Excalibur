import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import Contexts from "./Contexts";

// Purge secrets persisted by older versions
// (`authInfo` formerly contained the password; `vaultInfo` formerly contained the AUK and plaintext
// vault key)
localStorage.removeItem("authInfo");
localStorage.removeItem("vaultInfo");

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <Contexts>
            <App />
        </Contexts>
    </React.StrictMode>,
);
