import { Capacitor } from "@capacitor/core";
import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router";

import { Color, menuController } from "@ionic/core/components";
import {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonFabList,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonText,
    IonToolbar,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { add, documentOutline, ellipsisVertical, folderOutline, keyOutline } from "ionicons/icons";

import { checkDir, checkPath, deleteItem, mkdir, moveItem, renameItem } from "@lib/files/api";
import { useTokenManager, useUploadFile } from "@lib/hooks";
import { getParent } from "@lib/util";

import FolderOpener from "@native/FolderOpenerPlugin";

import SidebarMenu from "@components/SidebarMenu";
import { useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import DirectoryBreadcrumbs from "@components/explorer/DirectoryBreadcrumbs";
import FilesArea from "@components/explorer/FilesArea";
import { explorerContext } from "@components/explorer/context";
import JobsList from "@components/explorer/jobs/JobsList";
import { ProvideJobs, useJobsManager } from "@components/explorer/jobs/context";

const FabButton: React.FC<{ onCreateFolder: () => void }> = (props) => {
    // Hooks
    const { onUploadFile } = useUploadFile();

    // Render
    return (
        <IonFab id="fab-button" slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton>
                <IonIcon icon={add} />
            </IonFabButton>
            <IonFabList side="top">
                <IonFabButton aria-label="Create Folder" onClick={() => props.onCreateFolder()}>
                    <IonIcon icon={folderOutline} />
                </IonFabButton>
                <IonFabButton aria-label="Upload File" onClick={() => onUploadFile()}>
                    <IonIcon icon={documentOutline} />
                </IonFabButton>
            </IonFabList>
        </IonFab>
    );
};

const JobsSummary: React.FC<{
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = (props) => {
    // Contexts
    const jobsManager = useJobsManager();

    // Render
    return (
        <div id="jobs-summary" className="p-2 hover:cursor-pointer" onClick={props.onClick}>
            {jobsManager.jobs.size > 0 ? (
                <span>
                    {jobsManager.jobs.size} Job{jobsManager.jobs.size === 1 ? "" : "s"}
                </span>
            ) : (
                <span>No Jobs</span>
            )}
        </div>
    );
};

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [presentAlert, dismissAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const jobsPopover = useRef<HTMLIonPopoverElement>(null);
    const [showJobsPopover, setShowJobsPopover] = useState(false);

    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Helper functions
    /**
     * Displays a toast with the given message and colour.
     *
     * @param message The message to display
     * @param colour The colour of the toast
     */
    const presentSnackbar = useCallback(
        (message: string, colour: Color = "primary") => {
            presentToast({
                message: message,
                duration: 2000,
                position: "bottom",
                positionAnchor: "fab-button",
                color: colour,
            });
        },
        [presentToast],
    );

    // Hooks
    useTokenManager();

    // Functions
    /**
     * Logs the user out of the app and navigates back to the login screen.
     *
     * @param withLogout If true, calls the logout function to invalidate the current token. If
     *      false, only navigates back to the login screen.
     */
    async function handleLogout(withLogout: boolean = true) {
        // Show toast
        presentSnackbar("You have been logged out", "success");

        // Navigate back to login
        router.push("/login", "forward", "replace");

        // Log user out
        if (withLogout) {
            await auth.logout();
        }
    }

    /**
     * Prompts the user for a folder name, then creates a new folder at the requested path.
     */
    function onCreateFolder() {
        // Ask for user input
        presentAlert({
            header: "Enter Folder Name",
            inputs: [{ type: "text", name: "folderName", placeholder: "Folder Name" }],
            buttons: [
                "Cancel",
                {
                    text: "Create",
                    handler: async (data: { folderName: string }) => {
                        const folderName = data.folderName;
                        if (folderName === "") {
                            presentSnackbar("Folder name cannot be empty", "danger");
                            return;
                        }

                        // Check if folder exists
                        const checkResponse = await checkPath(auth, `${requestedPath}/${folderName}`);
                        if (!checkResponse.success) {
                            switch (checkResponse.error) {
                                case "Path not found":
                                    // This is good -- the folder doesn't exist, so we can just carry on
                                    break;
                                case "Unauthorized":
                                    presentSnackbar("Unauthorized", "danger");
                                    return;
                                case "Illegal or invalid path":
                                    presentSnackbar("Illegal or invalid folder name", "danger");
                                    return;
                                case "Path too long":
                                    presentSnackbar("Folder path too long", "danger");
                                    return;
                                default:
                                    presentSnackbar("Failed to check folder path: Unknown error", "danger");
                                    return;
                            }
                        }
                        if (checkResponse.success && checkResponse.type === "directory") {
                            presentSnackbar("Folder already exists", "danger");
                            return;
                        }

                        // Create the folder
                        const mkdirResponse = await mkdir(auth, requestedPath, folderName);
                        if (!mkdirResponse.success) {
                            presentSnackbar(`Failed to create folder: ${mkdirResponse.error}`, "danger");
                            return;
                        }

                        presentSnackbar("Folder created", "success");
                    },
                },
            ],
        });
    }

    /**
     * Handles the user clicking the rename button on a directory item.
     *
     * @param path The path of the item to rename
     * @param isDir If true, the item is a directory. If false, the item is a file
     */
    async function onRenameItem(path: string, isDir: boolean) {
        const baseName = path.split("/").pop();

        // Ask for user input
        presentAlert({
            header: "Enter New Name",
            inputs: [
                {
                    type: "text",
                    name: "newName",
                    placeholder: "New Name",
                    value: !isDir ? baseName?.replace(/\.exef$/, "") : baseName,
                },
            ],
            buttons: [
                "Cancel",
                {
                    text: "Rename",
                    handler: async (data: { newName: string }) => {
                        let newName = data.newName;
                        if (newName === "") {
                            presentSnackbar("New name cannot be empty", "danger");
                            return;
                        }
                        if (!isDir) {
                            newName += ".exef";
                        }

                        const renameResponse = await renameItem(auth, path, newName);
                        if (!renameResponse.success) {
                            presentSnackbar(`Failed to rename item: ${renameResponse.error}`, "danger");
                            return;
                        }

                        presentSnackbar("Item renamed", "success");
                    },
                },
            ],
        });
    }

    /**
     * Handles the user clicking the move button on a directory item.
     *
     * @param path The path of the item to move
     */
    async function onMoveItem(path: string) {
        // TODO: Update this method to be less janky - should just allow moving within GUI, not make a popup
        const origPath = getParent("./" + path);

        // Ask for user input
        presentAlert({
            header: "Enter New Destination Folder",
            subHeader: "'.' means root directory",
            inputs: [
                {
                    type: "text",
                    name: "newPath",
                    placeholder: "New Path",
                    value: origPath,
                },
            ],
            buttons: [
                "Cancel",
                {
                    text: "Move",
                    handler: async (data: { newPath: string }) => {
                        const newPath = data.newPath;
                        if (newPath === "") {
                            presentSnackbar("New path cannot be empty", "danger");
                            return;
                        }

                        const moveResponse = await moveItem(auth, path, newPath);
                        if (!moveResponse.success) {
                            presentSnackbar(`Failed to move item: ${moveResponse.error}`, "danger");
                            return;
                        }

                        presentSnackbar("Item moved", "success");
                    },
                },
            ],
        });
    }

    /**
     * Handles the user clicking the delete button on a directory item.
     *
     * @param path The path of the item to delete
     * @param isDir If true, the item is a directory. If false, the item is a file
     */
    async function onDeleteItem(path: string, isDir: boolean, force: boolean = false) {
        if (isDir) {
            const dirResponse = await checkDir(auth, path);
            if (!dirResponse.success) {
                presentSnackbar(`Failed to delete item: ${dirResponse.error}`, "danger");
                return;
            }
            if (!dirResponse.isEmpty && !force) {
                presentAlert({
                    header: "Directory is not empty",
                    message: "Are you sure that you want to delete the directory?",
                    buttons: [
                        {
                            text: "Cancel",
                            role: "cancel",
                        },
                        {
                            text: "Delete",
                            handler: async () => await onDeleteItem(path, isDir, true),
                        },
                    ],
                });
                return;
            }
        }

        const deleteResponse = await deleteItem(auth, path, isDir, force);
        if (!deleteResponse.success) {
            presentSnackbar(`Failed to delete item: ${deleteResponse.error}`, "danger");
            return;
        }

        presentSnackbar(`Deleted ${isDir ? "directory" : "file"}`, "success");
    }

    // Render
    return (
        <>
            {/* Hamburger menu */}
            <SidebarMenu
                mainContentID="main-content"
                menuController={menuController}
                exitButtonText="Logout"
                onExit={() => handleLogout()}
            ></SidebarMenu>

            {/* Ellipsis menu */}
            <IonPopover dismissOnSelect={true} trigger="ellipsis-button">
                <IonContent>
                    <IonList lines="none" className="h-full [&_ion-label]:flex [&_ion-label]:items-center">
                        <IonItem button={true} onClick={() => setShowVaultKeyDialog(true)}>
                            <IonLabel>
                                <IonIcon icon={keyOutline} size="large" />
                                <IonText className="pl-2">View Vault Key</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem
                            className={!Capacitor.isPluginAvailable("FolderOpener") ? "hidden" : ""}
                            button={true}
                            onClick={() => {
                                FolderOpener.openExcaliburFolder().catch((error) => {
                                    presentSnackbar(`Failed to open Excalibur folder: ${error}`, "danger");
                                });
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={folderOutline} size="large" />
                                <IonText className="pl-2">Open Excalibur Folder</IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>
                </IonContent>
            </IonPopover>

            {/* Main content */}
            <IonPage id="main-content">
                <ProvideJobs>
                    {/* Header content */}
                    <IonHeader>
                        <IonToolbar className="[&::part(container)]:min-h-16">
                            {/* Left-side buttons */}
                            <IonButtons className="w-24" slot="start">
                                <IonMenuButton onClick={() => menuController.open()} />
                            </IonButtons>

                            {/* Jobs display and popover */}
                            <div className="flex w-full justify-center">
                                {/* Jobs' summary */}
                                <JobsSummary
                                    onClick={(e) => {
                                        jobsPopover.current!.event = e;
                                        setShowJobsPopover(true);
                                    }}
                                ></JobsSummary>

                                {/* Jobs' details */}
                                <IonPopover
                                    ref={jobsPopover}
                                    id="jobs-popover"
                                    className="[&::part(content)]:w-100 [&::part(content)]:max-w-[90vw]"
                                    side="bottom"
                                    alignment="center"
                                    style={{ "--offset-y": "calc(var(--spacing)*2)" }}
                                    isOpen={showJobsPopover}
                                    onDidDismiss={() => setShowJobsPopover(false)}
                                >
                                    <IonContent className="ion-padding rounded-lg">
                                        <JobsList />
                                    </IonContent>
                                </IonPopover>
                            </div>

                            {/* Right-side buttons */}
                            <IonButtons className="w-24 justify-end" slot="end">
                                {/* Ellipsis menu trigger button */}
                                <IonButton id="ellipsis-button">
                                    <IonIcon slot="icon-only" icon={ellipsisVertical} />
                                </IonButton>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>

                    {/* Body content */}
                    <IonContent fullscreen>
                        <explorerContext.Provider
                            value={{
                                path: requestedPath,
                                onRename: onRenameItem,
                                onMove: onMoveItem,
                                onDelete: onDeleteItem,
                                presentAlert: presentAlert,
                                dismissAlert: dismissAlert,
                                presentSnackbar: presentSnackbar,
                            }}
                        >
                            {/* Refresh indicator */}
                            <IonRefresher
                                slot="fixed"
                                onIonRefresh={(event) => {
                                    setRefreshTrigger((prev) => prev + 1);
                                    event.detail.complete();
                                }}
                            >
                                <IonRefresherContent />
                            </IonRefresher>

                            {/* Vault key info dialog */}
                            <VaultKeyDialog
                                isOpen={showVaultKeyDialog}
                                onDidDismiss={() => setShowVaultKeyDialog(false)}
                            />

                            {/* Breadcrumb */}
                            <DirectoryBreadcrumbs className="ml-1 pt-1" path={requestedPath} />

                            {/* Fab button */}
                            <FabButton onCreateFolder={onCreateFolder} />

                            {/* Files */}
                            <FilesArea refreshTrigger={refreshTrigger} />

                            {/* Changed vault key notice */}
                            {auth.origVaultKey && auth.origVaultKey !== auth.vaultKey && (
                                <div className="fixed bottom-6 w-full">
                                    <IonText color="warning" className="block w-full text-center text-sm">
                                        Vault key was changed
                                        {/* <br></br>
                                        {auth.origVaultKey}
                                        <br></br>
                                        {auth.vaultKey}
                                        <br></br>
                                        {auth.origVaultKey !== auth.vaultKey ? "Changed" : "Not Changed"} */}
                                    </IonText>
                                </div>
                            )}
                        </explorerContext.Provider>
                    </IonContent>
                </ProvideJobs>
            </IonPage>
        </>
    );
};

export default FileExplorer;
