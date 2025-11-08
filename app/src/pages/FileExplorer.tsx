import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { FilePicker, PickedFile } from "@capawesome/capacitor-file-picker";
import * as Comlink from "comlink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useImmer } from "use-immer";

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
    IonMenu,
    IonMenuButton,
    IonPage,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonText,
    IonTitle,
    IonToolbar,
    RefresherEventDetail,
    useIonAlert,
    useIonRouter,
    useIonToast,
} from "@ionic/react";
import {
    add,
    cloudUploadOutline,
    documentOutline,
    ellipsisVertical,
    folderOutline,
    informationCircleOutline,
    keyOutline,
    logOutOutline,
    settingsOutline,
} from "ionicons/icons";

import { checkDir, checkPath, checkSize, deleteItem, listdir, mkdir, renameItem, uploadFile } from "@lib/files/api";
import { Directory } from "@lib/files/structures";
import { getNewToken } from "@lib/security/api";
import { decodeJWT } from "@lib/security/token";
import { EncryptionProcessor } from "@lib/workers/encrypt-stream";
import EncryptionProcessorWorker from "@lib/workers/encrypt-stream?worker";

import FolderOpener from "@native/FolderOpenerPlugin";

import Versions from "@components/Versions";
import { useAuth } from "@components/auth/context";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import DirectoryBreadcrumbs from "@components/explorer/DirectoryBreadcrumbs";
import DirectoryList from "@components/explorer/DirectoryList";
import { Job } from "@components/explorer/JobEntry";
import JobsList from "@components/explorer/JobsList";
import { JobsManager, uiFeedbackContext } from "@components/explorer/context";
import { useSettings } from "@components/settings/context";

const TOKEN_EARLY_REFRESH_THRESHOLD = 0.95; // 95% of token expiry then refresh
const TOKEN_EARLY_REFRESH_MIN_REQUEST_TIME = 5 * 1000; // 5 seconds

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Get contexts
    const auth = useAuth();
    const settings = useSettings();
    const router = useIonRouter();

    // States
    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const jobsPopover = useRef<HTMLIonPopoverElement>(null);
    const [showJobsPopover, setShowJobsPopover] = useState(false);
    const [jobs, updateJobs] = useImmer<Map<string, Job>>(new Map());
    const jobsManager: JobsManager = useMemo(() => {
        return {
            getJob(id: string): Job {
                return jobs.get(id)!;
            },
            addJob(id: string, job: Job): void {
                updateJobs((draft) => {
                    draft.set(id, job);
                });
            },
            updateJob(id: string, newStatus: string, newProgress?: number | null): void {
                updateJobs((draft) => {
                    const job = draft.get(id);
                    if (!job) {
                        // We will fail semi-silently
                        console.warn(`Job ${id} not found for job update`);
                        return;
                    }
                    job.status = newStatus;
                    if (newProgress !== undefined) {
                        job.progress = newProgress;
                    }
                });
            },
            updateProgress(id: string, newProgress: number | null): void {
                updateJobs((draft) => {
                    const job = draft.get(id);
                    if (!job) {
                        // We will fail semi-silently
                        console.warn(`Job ${id} not found for progress update`);
                        return;
                    }
                    job.progress = newProgress;
                });
            },
            deleteJob(id: string): void {
                updateJobs((draft) => {
                    draft.delete(id);
                });
            },
        };
    }, [jobs, updateJobs]);

    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);
    const [showFileUploadOverlay, setShowFileUploadOverlay] = useState(false);
    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);

    const [tokenExpiry, _setTokenExpiry] = useState(() => {
        const { exp: expTimestamp } = decodeJWT<{ exp: number }>(auth.getToken()!);
        return new Date(expTimestamp * 1000).getTime() - new Date().getTime() - auth.serverInfo!.deltaTime;
    });
    const [tokenRefreshInterval, _setTokenRefreshInterval] = useState(() => {
        const refreshInterval = Math.min(
            tokenExpiry * TOKEN_EARLY_REFRESH_THRESHOLD, // Wait for threshold until sending request...
            tokenExpiry - TOKEN_EARLY_REFRESH_MIN_REQUEST_TIME, // or so that we have enough time to receive response
        );
        console.debug(`Token refresh interval is ${refreshInterval / 1000} s`);
        return refreshInterval;
    });
    const [tokenTimeoutActive, setTokenTimeoutActive] = useState(false);

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
     * Fetches the contents of the current directory and updates the component state to reflect
     * the new contents.
     *
     * If the request fails, it displays a toast with an error message and does not update the
     * component state.
     *
     * @param showToast If true, displays a toast telling the user that the page was refreshed
     */
    const refreshContents = useCallback(
        async (showToast: boolean = true) => {
            const response = await listdir(auth, requestedPath);
            if (!response.success) {
                presentSnackbar(response.error!, "danger");
                return;
            }
            setDirectoryContents(response.directory!);
            if (showToast) {
                presentSnackbar("Refreshed");
            }
        },
        [auth, requestedPath, presentSnackbar],
    );

    /**
     * Prompts the user to choose a file, encrypts it, and uploads it to the current directory.
     *
     * If the request fails, it displays a toast with an error message.
     *
     * @param files The files to upload. If undefined, the user will be prompted to choose a file
     * @returns A promise which resolves when the upload is complete
     */
    async function onUploadFile(files?: PickedFile[]) {
        let force = false;

        /**
         * Handles the file upload process.
         *
         * @param rawFile A {@link PickedFile} object
         */
        async function _handleUpload(rawFile: PickedFile) {
            // Create new job
            const jobID = crypto.randomUUID();
            jobsManager.addJob(jobID, {
                filename: rawFile.name,
                status: "Setting up data stream...",
                progress: null,
            });

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

            // Create stream that handles the encryption and updates the progress
            jobsManager.updateJob(jobID, "Encrypting...");
            const worker = new EncryptionProcessorWorker();
            const processor = Comlink.wrap<EncryptionProcessor>(worker);

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
                        jobsManager.updateProgress(jobID, progress);
                    }),
                );
            } catch (e) {
                presentSnackbar(`Failed to encrypt file: ${(e as Error).message}`, "danger");
                jobsManager.deleteJob(jobID);
                return;
            } finally {
                // Free up resources
                worker.terminate();
            }

            // Upload the file
            console.debug(`Uploading file ${rawFile.name}...`);
            jobsManager.updateJob(jobID, "Uploading...", null); // Must specify null to reset progress
            const file = new File([blob], rawFile.name + ".exef");
            const uploadResponse = await uploadFile(auth, requestedPath, file, force);
            if (!uploadResponse.success) {
                presentSnackbar(`Failed to upload file: ${uploadResponse.error}`, "danger");
                jobsManager.deleteJob(jobID);
                return;
            }

            // Refresh page
            refreshContents(false);
            presentSnackbar("File uploaded", "success");
            jobsManager.deleteJob(jobID);
        }

        if (!files) {
            // Get file picker to let user choose the files
            try {
                // TODO: Change limit to more than 1
                files = (await FilePicker.pickFiles({ limit: 1 })).files;
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

        // TODO: Support multiple files. For now we accept one file
        const rawFile = files[0];

        // Check if file size acceptable by server
        const checkSizeResponse = await checkSize(auth, rawFile.size);
        if (!checkSizeResponse.success) {
            presentSnackbar(`Failed to check file size: ${checkSizeResponse.error}`, "danger");
            return;
        }
        if (checkSizeResponse.isTooLarge) {
            presentSnackbar("File too large", "danger");
            return;
        }

        // Check if file exists
        const eventualPath = `${requestedPath}/${rawFile.name}` + ".exef"; // The uploaded file has this extension
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

            await presentAlert({
                header: "File already exists",
                message: "Do you want to override the existing file?",
                buttons: [
                    {
                        text: "No",
                        role: "cancel",
                        handler: () => {
                            presentSnackbar("File upload cancelled", "warning");
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: () => {
                            force = true;
                            _handleUpload(rawFile);
                        },
                    },
                ],
            });
            return;
        }

        _handleUpload(rawFile);
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

                        refreshContents(false);
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

                        refreshContents(false);
                        presentSnackbar("Item renamed", "success");
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

        refreshContents(false);
        presentSnackbar(`Deleted ${isDir ? "directory" : "file"}`, "success");
    }

    // Effects
    useEffect(() => {
        // Refresh directory contents
        refreshContents(false);
    }, [requestedPath, refreshContents]);

    useEffect(() => {
        // Handle token renewal
        if (tokenTimeoutActive) {
            return;
        }

        setTokenTimeoutActive(true);
        setTimeout(async () => {
            console.debug("Renewing token as it is expiring soon");
            const response = await getNewToken(auth);
            if (!response.success) {
                // I guess we fail silently...
                return;
            }

            auth.setAuthInfo({ ...auth.authInfo!, token: response.token! });
            console.log(`Renewed token; new token is ${response.token}`);
            setTokenTimeoutActive(false);
        }, tokenRefreshInterval);
    }, [auth, tokenTimeoutActive, tokenRefreshInterval]);

    // Render
    return (
        <>
            {/* Hamburger menu */}
            <IonMenu type="overlay" contentId="main-content">
                <IonHeader>
                    <IonToolbar className="ion-padding-top min-h-16">
                        <IonTitle>
                            <div className="flex items-center gap-4">
                                <IonText className="flex-none font-bold [font-variant:small-caps]">Excalibur</IonText>
                                <IonText className="grow truncate text-right font-mono text-sm font-bold">
                                    {auth.authInfo?.username}
                                </IonText>
                            </div>
                        </IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonContent>
                    {/* Actions */}
                    <IonList
                        lines="none"
                        className="bg-transparent [&_ion-item]:[--background:transparent] [&_ion-label]:flex [&_ion-label]:items-center"
                    >
                        <IonItem
                            button={true}
                            onClick={() => {
                                router.push("/settings", "forward", "push");
                                menuController.close();
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={settingsOutline} size="large" />
                                <IonText className="pl-2">Settings</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem
                            button={true}
                            onClick={() => {
                                router.push("/credits", "forward", "push");
                                menuController.close();
                            }}
                        >
                            <IonLabel>
                                <IonIcon icon={informationCircleOutline} size="large" />
                                <IonText className="pl-2">Credits</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem button={true} onClick={() => handleLogout()}>
                            <IonLabel>
                                <IonIcon icon={logOutOutline} size="large" />
                                <IonText className="pl-2">Logout</IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>

                    {/* Details */}
                    <div className="ion-padding-start ion-padding-end pt-1 *:m-0 *:block *:text-xs md:*:text-sm">
                        <Versions />
                        <IonText color="medium">
                            Delta time: <span className="font-mono">{auth.serverInfo!.deltaTime} ms</span>
                        </IonText>
                    </div>
                </IonContent>
            </IonMenu>

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
            <IonPage
                id="main-content"
                onDragOver={(e) => {
                    e.preventDefault();
                    setShowFileUploadOverlay(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setShowFileUploadOverlay(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setShowFileUploadOverlay(false);
                    const files = [...e.dataTransfer.items]
                        .map((item) => item.getAsFile())
                        .filter((file) => file !== null)
                        .map((file) => {
                            return {
                                name: file.name,
                                size: file.size,
                                mimeType: file.type,
                                blob: file,
                            } as PickedFile;
                        });
                    onUploadFile(files);
                }}
            >
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
                                className="[&::part(content)]:min-w-80"
                                side="bottom"
                                alignment="center"
                                style={{ "--offset-y": "calc(var(--spacing)*2)" }}
                                isOpen={showJobsPopover}
                                onDidDismiss={() => setShowJobsPopover(false)}
                            >
                                <JobsList jobs={jobs} />
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
                    {/* File upload overlay */}
                    {showFileUploadOverlay && (
                        <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex flex-col items-center justify-center bg-black/50">
                            <IonIcon icon={cloudUploadOutline} className="size-20" />
                            <IonText>Drop files here to upload</IonText>
                        </div>
                    )}

                    {/* Vault key info dialog */}
                    <VaultKeyDialog isOpen={showVaultKeyDialog} onDidDismiss={() => setShowVaultKeyDialog(false)} />

                    {/* Refresh indicator */}
                    <IonRefresher
                        slot="fixed"
                        onIonRefresh={async (event: CustomEvent<RefresherEventDetail>) => {
                            setTimeout(async () => {
                                await refreshContents(false);
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

                    {/* Files list */}
                    {directoryContents && (
                        <uiFeedbackContext.Provider
                            value={{
                                jobsManager: jobsManager,
                                onRename: onRenameItem,
                                onDelete: onDeleteItem,
                                presentAlert: presentAlert,
                                presentToast: (options: ToastOptions) =>
                                    presentSnackbar(`${options.message}`, options.color),
                            }}
                        >
                            <DirectoryList {...directoryContents!} />
                        </uiFeedbackContext.Provider>
                    )}

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
