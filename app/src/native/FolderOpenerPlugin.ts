import { registerPlugin } from "@capacitor/core";

export interface FolderOpenerPlugin {
    openDocumentsFolder(): Promise<{ opened: boolean }>;
}

const FolderOpener = registerPlugin<FolderOpenerPlugin>("FolderOpener");

export default FolderOpener;
