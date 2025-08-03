import { Filesystem } from "@capacitor/filesystem";
import { FilePicker, PickedFile } from "@capawesome/capacitor-file-picker";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

import { menuController } from "@ionic/core/components";
import {
    IonBreadcrumb,
    IonBreadcrumbs,
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
import packageInfo from "@root/package.json";
import {
    add,
    chevronForward,
    documentOutline,
    ellipsisVertical,
    folderOutline,
    home,
    informationCircleOutline,
    keyOutline,
    logOutOutline,
    settingsOutline,
} from "ionicons/icons";

import ExEF from "@lib/exef";
import { checkDir, checkPath, checkSize, deleteItem, listdir, mkdir, uploadFile } from "@lib/files/api";
import { Directory } from "@lib/files/structures";
import { decodeJWT } from "@lib/security/token";
import { updateAndYield } from "@lib/util";

import Countdown from "@components/Countdown";
import ProgressDialog from "@components/dialog/ProgressDialog";
import VaultKeyDialog from "@components/dialog/VaultKeyDialog";
import DirectoryList from "@components/explorer/DirectoryList";
import { useAuth } from "@contexts/auth";
import { useSettings } from "@contexts/settings";

const FileExplorer: React.FC = () => {
    // Get file path parameter
    const params = useParams<{ [idx: number]: string }>();
    const requestedPath = params[0] ? params[0] : "."; // "." means root folder

    // Generate breadcrumbs to render
    const breadcrumbPaths = requestedPath.split("/").filter((p) => p !== ".");

    // Get token expiry
    const auth = useAuth();
    const { exp: expTimestamp } = decodeJWT<{ exp: number }>(auth.token!);
    const tokenExpiry = new Date(expTimestamp * 1000);

    // Get settings
    const settings = useSettings();

    // States
    const router = useIonRouter();

    const [presentAlert] = useIonAlert();
    const [presentToast] = useIonToast();

    const [showProgressDialog, setShowProgressDialog] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [dialogMessage, setDialogMessage] = useState("");

    const [showVaultKeyDialog, setShowVaultKeyDialog] = useState(false);

    const [directoryContents, setDirectoryContents] = useState<Directory | null>(null);

    // Functions
    /**
     * Logs the user out of the app and navigates back to the login screen.
     *
     * @param withLogout If true, calls the logout function to invalidate the current token. If
     *      false, only navigates back to the login screen.
     */
    async function handleLogout(withLogout: boolean = true) {
        // Show toast
        presentToast({
            message: "You have been logged out.",
            duration: 3000,
        });

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
                presentToast({
                    message: response.error,
                    duration: 3000,
                    color: "danger",
                });
                return;
            }
            setDirectoryContents(response.directory!);
            if (showToast) {
                presentToast({
                    message: "Refreshed",
                    duration: 1000,
                });
            }
        },
        [auth, requestedPath, presentToast],
    );

    /**
     * Prompts the user to choose a file, encrypts it, and uploads it to the current directory.
     *
     * If the request fails, it displays a toast with an error message.
     *
     * @returns A promise which resolves when the upload is complete.
     */
    async function onUploadFile() {
        let force = false;

        /**
         * Handles the actual file upload process.
         *
         * @param rawFile A {@link PickedFile} object
         */
        async function handleFileUpload(rawFile: PickedFile) {
            // Show dialog
            setShowProgressDialog(true);
            setUploadProgress(null);

            // Get contents of file
            setDialogMessage("Reading file contents...");
            let rawFileData: Buffer;
            if (rawFile.blob) {
                // Blob means that we are on web
                console.debug("On web; using blob for raw file data");
                rawFileData = Buffer.from(await rawFile.blob.arrayBuffer());
            } else {
                // TODO: Should we cap the file size on mobile?
                // No blob means that we are on mobile
                console.debug(`On mobile; fetching data from path: ${rawFile.path!}`);

                // TODO: Should we use the `readFileInChunks` method?
                const result = await Filesystem.readFile({
                    path: rawFile.path!,
                });
                rawFileData = Buffer.from(result.data as string, "base64");
            }
            if (!rawFileData) {
                presentToast({
                    message: "Failed to get file contents",
                    duration: 3000,
                    color: "danger",
                });
                setShowProgressDialog(false);
                return;
            }

            const rawFileSize = rawFileData.length;
            const encryptedFileSize = rawFileSize + ExEF.additionalSize;

            // Encrypt the file using a stream
            const exef = new ExEF(auth.vaultKey!);
            const rawFileDataStream = new ReadableStream<Buffer>({
                start(controller) {
                    for (let i = 0; i < rawFileSize / settings.cryptoChunkSize; i++) {
                        controller.enqueue(
                            rawFileData.subarray(
                                i * settings.cryptoChunkSize,
                                i * settings.cryptoChunkSize + settings.cryptoChunkSize,
                            ),
                        );
                    }
                    controller.close();
                },
            });

            setDialogMessage("Encrypting...");
            const encryptStream = exef.encryptStream(rawFileSize, rawFileDataStream);
            const reader = encryptStream.getReader();
            let encryptedFileData: Buffer = Buffer.from([]);
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                encryptedFileData = Buffer.concat([encryptedFileData, value]);
                await updateAndYield(encryptedFileData.length / encryptedFileSize, setUploadProgress);
                console.debug(
                    `Encrypted ${encryptedFileData.length} / ${encryptedFileSize} (${((encryptedFileData.length / encryptedFileSize) * 100).toFixed(2)}%)`,
                );
            }

            const encryptedFile = new File([encryptedFileData], rawFile.name + ".exef");

            // Upload the file
            // TODO: Stream contents of file upload
            setDialogMessage("Uploading...");
            setUploadProgress(null);

            const uploadResponse = await uploadFile(auth, requestedPath, encryptedFile, force);
            if (!uploadResponse.success) {
                presentToast({
                    message: `Failed to upload file: ${uploadResponse.error}`,
                    duration: 3000,
                    color: "danger",
                });
                setShowProgressDialog(false);
                return;
            }

            // Refresh page
            refreshContents(false);
            presentToast({
                message: "File uploaded",
                duration: 3000,
                color: "success",
            });
            setShowProgressDialog(false);
        }

        // Pick the file to upload
        let result;
        try {
            result = await FilePicker.pickFiles({
                limit: 1, // TODO: allow uploading multiple files
            });
        } catch (e: unknown) {
            const message = (e as Error).message;
            if (message.includes("pickFiles canceled")) {
                console.debug("Cancelled upload of file");
                return;
            }
            presentToast({
                message: `Failed to pick file: ${message}`,
                duration: 3000,
                color: "danger",
            });
            return;
        }

        const rawFile = result.files[0];

        // Check if file size acceptable by server
        const checkSizeResponse = await checkSize(auth, rawFile.size);
        if (!checkSizeResponse.success) {
            presentToast({
                message: `Failed to check file size: ${checkSizeResponse.error}`,
                duration: 3000,
                color: "danger",
            });
            setShowProgressDialog(false);
            return;
        }
        if (checkSizeResponse.isTooLarge) {
            presentToast({
                message: "File too large",
                duration: 3000,
                color: "danger",
            });
            setShowProgressDialog(false);
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
                    presentToast({
                        message: "Illegal or invalid file name",
                        duration: 3000,
                        color: "danger",
                    });
                    return;
                case "Path too long":
                    presentToast({
                        message: "File path too long",
                        duration: 3000,
                        color: "danger",
                    });
                    return;
                default:
                    presentToast({
                        message: "Failed to check file path: Unknown error",
                        duration: 3000,
                        color: "danger",
                    });
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
                            presentToast({
                                message: "File upload cancelled",
                                duration: 2000,
                                color: "warning",
                            });
                        },
                    },
                    {
                        text: "Yes",
                        role: "confirm",
                        handler: () => {
                            force = true;
                            handleFileUpload(rawFile);
                        },
                    },
                ],
            });
            return;
        }

        handleFileUpload(rawFile);
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
                            presentToast({
                                message: "Folder name cannot be empty",
                                duration: 3000,
                                color: "danger",
                            });
                            return;
                        }

                        // Check if folder exists
                        const checkResponse = await checkPath(auth, `${requestedPath}/${folderName}`);
                        if (!checkResponse.success && checkResponse.error === "Illegal or invalid path") {
                            presentToast({
                                message: "Illegal or invalid folder name",
                                duration: 3000,
                                color: "danger",
                            });
                            return;
                        }
                        if (checkResponse.success && checkResponse.type === "directory") {
                            presentToast({
                                message: "Folder already exists",
                                duration: 3000,
                                color: "danger",
                            });
                            return;
                        }

                        // Create the folder
                        const mkdirResponse = await mkdir(auth, requestedPath, folderName);
                        if (!mkdirResponse.success) {
                            presentToast({
                                message: `Failed to create folder: ${mkdirResponse.error}`,
                                duration: 3000,
                                color: "danger",
                            });
                            return;
                        }

                        refreshContents(false);
                        presentToast({
                            message: "Folder created",
                            duration: 3000,
                        });
                    },
                },
            ],
        });
    }

    /**
     * Handles the user clicking the delete button on a directory item.
     *
     * @param path The path of the item to delete
     * @param isDir If true, the item is a directory. If false, the item is a file.
     */
    async function onDeleteItem(path: string, isDir: boolean, force: boolean = false) {
        if (isDir) {
            const dirResponse = await checkDir(auth, path);
            if (!dirResponse.success) {
                presentToast({
                    message: `Failed to delete item: ${dirResponse.error}`,
                    duration: 3000,
                    color: "danger",
                });
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
            presentToast({
                message: `Failed to delete item: ${deleteResponse.error}`,
                duration: 3000,
                color: "danger",
            });
        }

        refreshContents(false);
        presentToast({
            message: `Deleted ${isDir ? "directory" : "file"}`,
            duration: 3000,
        });
    }

    // Effects
    useEffect(() => {
        // Refresh directory contents
        refreshContents(false);
    }, [requestedPath, refreshContents]);

    // Render
    return (
        <>
            {/* Hamburger menu */}
            <IonMenu type="overlay" contentId="main-content">
                <IonHeader>
                    <IonToolbar className="ion-padding-top min-h-16">
                        <IonTitle>
                            <IonText className="font-bold [font-variant:small-caps]">Excalibur</IonText>
                        </IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonContent>
                    {/* Actions */}
                    <IonList
                        lines="none"
                        className="!bg-transparent [&_ion-item]:[--background:transparent] [&_ion-label]:!flex [&_ion-label]:!items-center"
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

                    {/* Info */}
                    <div className="ion-padding-start ion-padding-end pt-1 *:m-0 *:block">
                        <IonText color="medium" className="text-xs md:text-sm">
                            App version: <span className="font-mono">{packageInfo.version}</span>
                        </IonText>
                        <IonText color="medium" className="text-xs md:text-sm">
                            Server version: <span className="font-mono">{auth.serverInfo!.version}</span>
                        </IonText>
                    </div>
                </IonContent>
            </IonMenu>

            {/* Ellipsis menu */}
            <IonPopover dismissOnSelect={true} trigger="ellipsis-button">
                <IonContent>
                    <IonList lines="none" className="h-full [&_ion-label]:!flex [&_ion-label]:!items-center">
                        <IonItem button={true} onClick={() => setShowVaultKeyDialog(true)}>
                            <IonLabel>
                                <IonIcon icon={keyOutline} size="large" />
                                <IonText className="pl-2">View Vault Key</IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem>TODO: Add more ellipsis menu items</IonItem>
                    </IonList>
                </IonContent>
            </IonPopover>

            {/* Main content */}
            <IonPage id="main-content">
                {/* Header content */}
                <IonHeader>
                    <IonToolbar className="ion-padding-top flex">
                        <IonButtons className="w-24" slot="start">
                            <IonMenuButton onClick={() => menuController.open()} />
                        </IonButtons>
                        <div className="flex" slot="">
                            <Countdown
                                className="w-full text-center"
                                endDate={new Date(tokenExpiry.getTime() - auth.serverInfo!.deltaTime)}
                                onExpiry={() => handleLogout(false)}
                            />
                        </div>
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
                    {/* Encryption/Decryption progress indicator */}
                    <ProgressDialog
                        isOpen={showProgressDialog}
                        message={dialogMessage}
                        progress={uploadProgress}
                        onDidDismiss={() => setShowProgressDialog(false)}
                    />

                    {/* Vault key info dialog */}
                    <VaultKeyDialog
                        isOpen={showVaultKeyDialog}
                        vaultKey={auth.vaultKey!}
                        setVaultKey={auth.setVaultKey}
                        onDidDismiss={() => setShowVaultKeyDialog(false)}
                    />

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
                    <IonBreadcrumbs className="ml-1 pt-1" maxItems={6} itemsBeforeCollapse={3} itemsAfterCollapse={3}>
                        <IonBreadcrumb routerLink="/files/" routerDirection="back">
                            <IonIcon slot="" icon={home} />
                            <IonIcon slot="separator" icon={chevronForward} />
                        </IonBreadcrumb>
                        {breadcrumbPaths.map((fragment, idx) => (
                            <IonBreadcrumb
                                key={idx}
                                routerLink={`/files/${breadcrumbPaths.slice(0, idx + 1).join("/")}`}
                                routerDirection="back"
                            >
                                {fragment}
                                <IonIcon slot="separator" icon={chevronForward} />
                            </IonBreadcrumb>
                        ))}
                    </IonBreadcrumbs>

                    {/* Fab button */}
                    <IonFab slot="fixed" vertical="bottom" horizontal="end">
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
                        <DirectoryList
                            {...directoryContents!}
                            feedbackMethods={{
                                onDelete: onDeleteItem,
                                setShowDialog: setShowProgressDialog,
                                setDialogMessage: setDialogMessage,
                                setProgress: setUploadProgress,
                                presentAlert: presentAlert,
                                presentToast: presentToast,
                            }}
                        />
                    )}
                </IonContent>
            </IonPage>
        </>
    );
};

export default FileExplorer;
