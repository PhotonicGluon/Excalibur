import React from "react";
import { createRoot } from "react-dom/client";

import { ProvideAuth } from "@contexts/auth";
import { ProvideSettings } from "@contexts/settings";
import { ProvideVault } from "@contexts/vault";

import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <ProvideAuth>
            <ProvideVault>
                <ProvideSettings>
                    <App />
                </ProvideSettings>
            </ProvideVault>
        </ProvideAuth>
    </React.StrictMode>,
);
