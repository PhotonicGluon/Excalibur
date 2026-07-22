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
    useIonViewWillEnter,
} from "@ionic/react";
import {
    add,
    documentOutline,
    ellipsisVertical,
    folderOutline,
    listOutline,
    personOutline,
    searchOutline,
} from "ionicons/icons";

import { checkDir, checkPath, deleteItem, mkdir, renameItem } from "@lib/files/api";
import { useTokenManager, useUploadFile } from "@lib/hooks";

import FolderOpener from "@native/FolderOpenerPlugin";

import SidebarMenu from "@components/SidebarMenu";
import { useAuth } from "@components/auth/context";
import MoveDialog from "@components/dialog/MoveDialog";
import SearchDialog from "@components/dialog/SearchDialog";
import DirectoryBreadcrumbs from "@components/explorer/DirectoryBreadcrumbs";
import FilesArea from "@components/explorer/FilesArea";
import { explorerContext } from "@components/explorer/context";
import JobsModal from "@components/explorer/jobs/JobsModal";
import { ProvideJobs } from "@components/explorer/jobs/context";

const FabButton: React.FC<{ onCreateFolder: () => void; isJobsDialogOpen: boolean }> = (props) => {
    // Hooks
    const { onUploadFile } = useUploadFile();

    // Render
    return (
        <IonFab
            id="fab-button"
            slot="fixed"
            vertical="bottom"
            horizontal="end"
            className={`${props.isJobsDialogOpen ? "mb-16" : ""} transform-all duration-100`}
        >
            <IonFabButton>
                <IonIcon icon={add} />
            </IonFabButton>
            <IonFabList side="top">
                <IonFabButton id="fab-create-folder" aria-label="Create Folder" onClick={() => props.onCreateFolder()}>
                    <IonIcon icon={folderOutline} />
                </IonFabButton>
                <IonFabButton id="fab-upload-file" aria-label="Upload File" onClick={() => onUploadFile()}>
                    <IonIcon icon={documentOutline} />
                </IonFabButton>
            </IonFabList>
        </IonFab>
    );
};

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Contexts
    const auth = useAuth();
    const router = useIonRouter();

    // States
    const [presentAlert, dismissAlert] = useIonAlert();
    const [presentToast, dismissToast] = useIonToast();

    const [showJobsModal, setShowJobsModal] = useState(false);

    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [moveOrigPath, setMoveOrigPath] = useState<string>("");

    const [showSearchDialog, setShowSearchDialog] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // References
    const topBarRef = useRef<HTMLDivElement>(null);

    // Helper functions
    /**
     * Displays a toast with the given message and colour.
     *
     * @param message The message to display
     * @param colour The colour of the toast
     */
    const presentSnackbar = useCallback(
        async (message: string, colour: Color = "primary") => {
            await dismissToast().catch(() => {}); // Safely handle cases where no toast is active
            presentToast({
                message: message,
                duration: 2000,
                position: "bottom",
                positionAnchor: "fab-button",
                color: colour,
                cssClass: "[--max-width:min(var(--spacing)*128,calc(100%-var(--spacing)*32))]",
            });
        },
        [presentToast, dismissToast],
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
        const rawName = path.split("/").pop();
        const baseName = !isDir ? rawName?.replace(/\.exef$/, "") : rawName;
        const displayName = auth.vaultInfo!.info.obfuscatedNames
            ? auth.noc!.decipher(baseName!).toString("utf-8")
            : baseName;

        // Ask for user input
        presentAlert({
            header: "Enter New Name",
            inputs: [
                {
                    type: "text",
                    name: "newDisplayName",
                    placeholder: "New Name",
                    value: displayName,
                },
            ],
            buttons: [
                "Cancel",
                {
                    text: "Rename",
                    handler: async (data: { newDisplayName: string }) => {
                        const newDisplayName = data.newDisplayName;
                        if (newDisplayName === "") {
                            presentSnackbar("New name cannot be empty", "danger");
                            return;
                        }

                        let newName = auth.vaultInfo!.info.obfuscatedNames
                            ? (auth.noc!.encipher(Buffer.from(newDisplayName, "utf-8")) as string)
                            : newDisplayName;
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
        setMoveOrigPath(path);
        setShowMoveDialog(true);
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

    // Lifecycle events
    useIonViewWillEnter(() => {
        // Make the top bar scroll to the end
        topBarRef.current!.scrollLeft = topBarRef.current!.scrollWidth;
    });

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
                        <IonItem button={true} onClick={() => setShowSearchDialog(true)}>
                            <IonLabel>
                                <IonIcon icon={searchOutline} size="large" />
                                <IonText className="pl-2">Search</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem button={true} onClick={() => setShowJobsModal(true)}>
                            <IonLabel>
                                <IonIcon icon={listOutline} size="large" />
                                <IonText className="pl-2">Jobs</IonText>
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
                        <IonItem button={true} routerLink="/preferences" routerDirection="forward">
                            <IonLabel>
                                <IonIcon icon={personOutline} size="large" />
                                <IonText className="pl-2">Preferences</IonText>
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
                        <IonToolbar className={"min-h-16" + (!Capacitor.isNativePlatform() ? " pt-1" : "")}>
                            {/* Left-side buttons */}
                            <IonButtons className="w-24" slot="start">
                                <IonMenuButton onClick={() => menuController.open()} />
                            </IonButtons>

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

                            {/* Dialogs */}
                            <MoveDialog
                                isOpen={showMoveDialog}
                                onDidDismiss={() => setShowMoveDialog(false)}
                                path={moveOrigPath}
                            />
                            <SearchDialog isOpen={showSearchDialog} onDidDismiss={() => setShowSearchDialog(false)} />

                            {/* Breadcrumbs */}
                            <div
                                ref={topBarRef}
                                className="ml-1 w-full scrollbar-thumb-blue-500/50 scrollbar-track-transparent overflow-x-scroll pt-1 hover:scrollbar-thumb-blue-500/50"
                            >
                                <DirectoryBreadcrumbs
                                    className="flex-nowrap"
                                    path={requestedPath}
                                    noc={auth.vaultInfo!.info.obfuscatedNames ? auth.noc! : undefined}
                                />
                            </div>

                            {/* Fab button */}
                            <FabButton isJobsDialogOpen={showJobsModal} onCreateFolder={onCreateFolder} />

                            {/* Files */}
                            <FilesArea refreshTrigger={refreshTrigger} />

                            {/* Jobs modal */}
                            <JobsModal isShown={showJobsModal} setIsShown={setShowJobsModal} />
                        </explorerContext.Provider>
                    </IonContent>
                </ProvideJobs>
            </IonPage>
        </>
    );
};

export default FileExplorer;
