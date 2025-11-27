import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import Contexts from "./Contexts";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <Contexts>
            <App />
        </Contexts>
    </React.StrictMode>,
);
