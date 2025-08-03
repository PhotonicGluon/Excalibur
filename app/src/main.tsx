import React from "react";
import { createRoot } from "react-dom/client";

import { ProvideSettings } from "@contexts/settings";

import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <ProvideSettings>
            <App />
        </ProvideSettings>
    </React.StrictMode>,
);
