import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { FilePicker, PickedFile } from "@capawesome/capacitor-file-picker";
import * as Comlink from "comlink";
import { DragEvent, useCallback, useRef, useState } from "react";
import { useParams } from "react-router";

import { Color, ToastOptions, menuController } from "@ionic/core/components";
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
    RefresherEventDetail,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import { add, documentOutline, ellipsisVertical, folderOutline, keyOutline } from "ionicons/icons";

import { checkDir, checkPath, checkSize, deleteItem, mkdir, moveItem, renameItem, uploadFile } from "@lib/files/api";
import { getAllFileEntries } from "@lib/files/webkit";
import { useDirectory, useJobsManager, useTokenManager } from "@lib/hooks";
import { randID } from "@lib/security/util";
import { getBaseName, getParent, getParents } from "@lib/util";
import { EncryptionProcessor } from "@lib/workers/encrypt-stream";
import EncryptionProcessorWorker from "@lib/workers/encrypt-stream?worker";

import FolderOpener from "@native/FolderOpenerPlugin";

import SidebarMenu from "@components/SidebarMenu";
import { useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import DirectoryBreadcrumbs from "@components/explorer/DirectoryBreadcrumbs";
import FilesArea from "@components/explorer/FilesArea";
import JobsList from "@components/explorer/JobsList";
import { explorerContext } from "@components/explorer/context";
import { useSettings } from "@components/settings/context";

type UploadFile = PickedFile & { directory?: string };

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get contexts
    const auth = useAuth();
    const settings = useSettings();
    const router = useIonRouter();

    // States
    const [presentAlert, dismissAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const jobsPopover = useRef<HTMLIonPopoverElement>(null);
    const [showJobsPopover, setShowJobsPopover] = useState(false);

    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

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
    const { jobs, jobsManager } = useJobsManager();
    const { refreshContents } = useDirectory(requestedPath, (options: ToastOptions) =>
        presentSnackbar(options.message as string, options.color),
    );
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
     * Prompts the user to choose a file, encrypts it, and uploads it to the current directory.
     *
     * If the request fails, it displays a toast with an error message.
     *
     * @param files The files to upload. If undefined, the user will be prompted to choose a file
     * @returns A promise which resolves when the upload is complete
     */
    async function onUploadFile(files?: UploadFile[]) {
        /**
         * Handles the file upload process.
         *
         * @param rawFile A {@link UploadFile} object
         */
        async function _handleUpload(rawFile: UploadFile) {
            // Create new job
            const jobID = randID();
            const controller = new AbortController();
            const signal = controller.signal;

            jobsManager.addJob(jobID, {
                direction: "upload",
                filename: rawFile.name,
                description: "Setting up data stream...",
                progress: null,
                controller: controller,
            });
            console.debug(`Created new job for '${rawFile.name}' with id '${jobID}'`);

            try {
                // Set up file data stream
                const rawFileSize = rawFile.size;
                let rawFileDataStream: ReadableStream<Buffer>;
                if (rawFile.blob) {
                    // Blob means that we are on web
                    console.debug("On web; using blob for raw file data");
                    const blob = rawFile.blob;
                    rawFileDataStream = blob.stream() as unknown as ReadableStream<Buffer>;
                } else {
                    console.debug(`On mobile; fetching data in chunks from path: ${rawFile.path!}`);
                    rawFileDataStream = new ReadableStream<Buffer>({
                        start(controller) {
                            Filesystem.readFileInChunks(
                                {
                                    path: rawFile.path!,
                                    chunkSize: settings.cryptoChunkSize, // TODO: Should this be its own value?
                                },
                                (chunk, err) => {
                                    if (err) {
                                        presentSnackbar("Failed to read file chunk", "danger");
                                        jobsManager.deleteJob(jobID);
                                        controller.error(err);
                                        return;
                                    }

                                    if (chunk === null || (chunk!.data as string).length === 0) {
                                        // File completely read
                                        controller.close();
                                        return;
                                    }

                                    controller.enqueue(Buffer.from(chunk.data as string, "base64"));
                                },
                            );
                        },
                    });
                }

                // Create worker that handles the encryption and updates the progress
                jobsManager.updateJob(jobID, "Encrypting...");
                const worker = new EncryptionProcessorWorker();
                const processor = Comlink.wrap<EncryptionProcessor>(worker);

                const abortHandler = () => {
                    // We catch errors here because if the worker is already terminating, calling `abort()` might fail,
                    // which we can ignore
                    processor.abort().catch(() => {});
                };
                signal.addEventListener("abort", abortHandler);

                let blob: Blob;
                try {
                    blob = await processor.processStream(
                        // `transfer()` moves datastream ownership to the worker instead of trying to clone it
                        Comlink.transfer(rawFileDataStream, [rawFileDataStream]),
                        auth.vaultKey!,
                        auth.authInfo!.key!,
                        rawFileSize,
                        settings.cryptoChunkSize,
                        // `proxy()` ensures the callback function works across threads
                        Comlink.proxy((progress) => {
                            if (!signal.aborted) {
                                jobsManager.updateProgress(jobID, progress);
                            }
                        }),
                    );
                } catch (e) {
                    if (signal.aborted) throw new Error("Cancelled");
                    presentSnackbar(`Failed to encrypt file: ${(e as Error).message}`, "danger");
                    throw e;
                } finally {
                    // Free up resources
                    signal.removeEventListener("abort", abortHandler);
                    worker.terminate();
                }

                if (signal.aborted) throw new Error("Cancelled");

                // Upload the file
                console.debug(`Uploading file ${rawFile.name}...`);
                jobsManager.updateJob(jobID, "Uploading...", null); // Must specify null to reset progress
                const file = new File([blob], rawFile.name + ".exef");
                const uploadResponse = await uploadFile(
                    auth,
                    requestedPath + (rawFile.directory ? "/" + rawFile.directory : ""),
                    file,
                    true,
                    signal,
                ); // Always force upload
                if (!uploadResponse.success) {
                    presentSnackbar(`Failed to upload file: ${uploadResponse.error}`, "danger");
                    throw new Error(uploadResponse.error);
                }
            } catch (e) {
                const err = e as Error;
                if (err.message == "Cancelled" || err.name === "AbortError") {
                    console.debug(`Job '${jobID}' (upload) cancelled`);
                    return;
                }
                console.error(err);
            } finally {
                jobsManager.deleteJob(jobID);
            }
        }

        if (!files) {
            // Get file picker to let user choose the files
            try {
                files = (await FilePicker.pickFiles()).files;
            } catch (e: unknown) {
                const message = (e as Error).message;
                if (message.includes("pickFiles canceled")) {
                    console.debug("Cancelled upload of file");
                    return;
                }
                presentSnackbar(`Failed to pick file: ${message}`, "danger");
                return;
            }
        }

        // Upload all files
        presentSnackbar("Uploading...");
        for (const file of files) {
            // Check if file size acceptable by server
            const checkSizeResponse = await checkSize(auth, file.size);
            if (!checkSizeResponse.success) {
                presentSnackbar(`Failed to check file size: ${checkSizeResponse.error}`, "danger");
                return;
            }
            if (checkSizeResponse.isTooLarge) {
                // We use an alert to make it more visible
                alert(`File ${file.name} is too large`);
                continue;
            }

            // Check if containing directories exist
            if (file.directory) {
                let dirs = getParents(file.directory + "/redundant"); // So that the target directory is included
                dirs = dirs.toReversed().slice(1);

                for (const dir of dirs) {
                    const checkDirResponse = await checkPath(auth, dir);
                    if (checkDirResponse.success) {
                        // Directory exists, continue
                    } else if (checkDirResponse.error === "Path not found") {
                        // Make directory
                        const createDirResponse = await mkdir(auth, getParent(dir), getBaseName(dir));
                        if (!createDirResponse.success) {
                            presentSnackbar(
                                `Failed to create containing directory: ${createDirResponse.error}`,
                                "danger",
                            );
                            return;
                        }
                    } else {
                        presentSnackbar(`Failed to check containing directory: ${checkDirResponse.error}`, "danger");
                        return;
                    }
                }
            }

            // Check if file exists
            const filePath = file.directory ? `${file.directory}/${file.name}` : file.name;
            const eventualPath = `${requestedPath}/${filePath}` + ".exef"; // The uploaded file has this extension
            const checkResponse = await checkPath(auth, eventualPath);
            if (!checkResponse.success) {
                switch (checkResponse.error) {
                    case "Path not found":
                        // This is good -- the file doesn't exist, so we can just carry on
                        break;
                    case "Illegal or invalid path":
                        presentSnackbar("Illegal or invalid file name", "danger");
                        return;
                    case "Path too long":
                        presentSnackbar("File path too long", "danger");
                        return;
                    default:
                        presentSnackbar(`Failed to check file path: ${checkResponse.error}`, "danger");
                        return;
                }
            }
            if (checkResponse.success && checkResponse.type === "file") {
                // File exists, ask if want to override
                console.debug(`File already exists at '${eventualPath}'; asking if want to override`);

                let haltUploads = false;
                await new Promise<void>((resolve) => {
                    presentAlert({
                        header: `${file.name} already exists`,
                        message: "Do you want to override the existing file?",
                        onDidDismiss: () => {
                            resolve();
                        },
                        buttons: [
                            {
                                text: "No",
                                role: "cancel",
                                handler: () => {
                                    presentSnackbar("File upload cancelled", "warning");
                                    haltUploads = true;
                                },
                            },
                            {
                                text: "Yes",
                                role: "confirm",
                            },
                        ],
                    });
                });
                if (haltUploads) {
                    return;
                }
            }

            _handleUpload(file);
        }
    }

    /**
     * Handles drag-and-drop of file item(s).
     *
     * @param e Drag and drop event
     */
    // TODO: Move
    async function _onDropFileItem(e: DragEvent<HTMLIonContentElement>) {
        // Gather items
        const items = [...e.dataTransfer.items]
            .filter((item) => item.kind === "file") // Drag data item is a file _or_ directory
            .map((item) => {
                const entry = item.webkitGetAsEntry();
                const file = item.getAsFile();
                if (entry === null || file === null) return null;
                return { entry, file };
            })
            .filter((item) => item !== null);

        // Get the file objects to be uploaded
        const files: File[] = [];
        for await (const handle of items) {
            if (handle.entry.isDirectory) {
                console.log(`Dropped directory: ${handle.entry.name}`);

                const entries = await getAllFileEntries([handle.entry]);
                for (const entry of entries) {
                    const file = await new Promise<File>((resolve, reject) => {
                        entry.file(resolve, reject);
                    });
                    files.push(file);
                }
            } else {
                console.debug(`Dropped file: ${handle.entry.name}`);
                files.push(handle.file);
            }
        }

        // Call upload file method
        onUploadFile(
            files.map((file) => {
                return {
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                    blob: file,
                    directory: getParent(file.webkitRelativePath),
                } as UploadFile;
            }),
        );
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
                            <div
                                id="jobs-summary"
                                className="hover:cursor-pointer"
                                onClick={(e) => {
                                    jobsPopover.current!.event = e;
                                    setShowJobsPopover(true);
                                }}
                            >
                                {jobs.size > 0 ? (
                                    <span>
                                        {jobs.size} Job{jobs.size === 1 ? "" : "s"}
                                    </span>
                                ) : (
                                    <span>No Jobs</span>
                                )}
                            </div>

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
                                    <JobsList
                                        jobs={jobs}
                                        onCancelJob={(jobID: string) => {
                                            jobsManager.cancelJob(jobID);
                                        }}
                                    />
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
                    {/* Vault key info dialog */}
                    <VaultKeyDialog isOpen={showVaultKeyDialog} onDidDismiss={() => setShowVaultKeyDialog(false)} />

                    {/* Refresh indicator */}
                    <IonRefresher
                        slot="fixed"
                        onIonRefresh={async (event: CustomEvent<RefresherEventDetail>) => {
                            setTimeout(async () => {
                                await refreshContents();
                                event.detail.complete();
                            }, 500);
                        }}
                    >
                        <IonRefresherContent />
                    </IonRefresher>

                    {/* Breadcrumb */}
                    <DirectoryBreadcrumbs className="ml-1 pt-1" path={requestedPath} />

                    {/* Fab button */}
                    <IonFab id="fab-button" slot="fixed" vertical="bottom" horizontal="end">
                        <IonFabButton>
                            <IonIcon icon={add} />
                        </IonFabButton>
                        <IonFabList side="top">
                            <IonFabButton aria-label="Create Folder" onClick={() => onCreateFolder()}>
                                <IonIcon icon={folderOutline} />
                            </IonFabButton>
                            <IonFabButton aria-label="Upload File" onClick={() => onUploadFile()}>
                                <IonIcon icon={documentOutline} />
                            </IonFabButton>
                        </IonFabList>
                    </IonFab>

                    {/* Files */}
                    <explorerContext.Provider
                        value={{
                            path: requestedPath,
                            onRename: onRenameItem,
                            onMove: onMoveItem,
                            onDelete: onDeleteItem,
                            presentAlert: presentAlert,
                            dismissAlert: dismissAlert,
                            presentToast: (options: ToastOptions) =>
                                presentSnackbar(`${options.message}`, options.color),
                        }}
                    >
                        <FilesArea />
                    </explorerContext.Provider>

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
                </IonContent>
            </IonPage>
        </>
    );
};

export default FileExplorer;
