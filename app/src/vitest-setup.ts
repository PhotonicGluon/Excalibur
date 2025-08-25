import "@testing-library/jest-dom/vitest";

import { setupIonicReact } from "@ionic/react";

setupIonicReact();

// Mock matchmedia
window.matchMedia =
    window.matchMedia ||
    function () {
        return {
            matches: false,
            addListener: function () {},
            removeListener: function () {},
        };
    };
