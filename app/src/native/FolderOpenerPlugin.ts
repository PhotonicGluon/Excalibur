import { registerPlugin } from "@capacitor/core";

export interface FolderOpenerPlugin {
    /**
     * Opens the Excalibur folder in a file explorer app.
     */
    openExcaliburFolder(): Promise<void>;
}

const FolderOpener = registerPlugin<FolderOpenerPlugin>("FolderOpener");

export default FolderOpener;
