import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import writeBlob from "capacitor-blob-writer";
import * as Comlink from "comlink";
import React from "react";

import {
    IonButton,
    IonButtons,
    IonCol,
    IonContent,
    IonGrid,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRow,
    IonSkeletonText,
    IonText,
    IonThumbnail,
    useIonPopover,
    useIonRouter,
} from "@ionic/react";
import { ellipsisVertical, moveOutline, pencilOutline, trashOutline } from "ionicons/icons";

import { randID } from "@lib/auth/util";
import ExEF from "@lib/crypto/exef";
import { downloadFile } from "@lib/files/api";
import { File, FileLike } from "@lib/files/structures";
import { getIcon, mimetypeToIcon } from "@lib/icons";
import { bytesToHumanReadable } from "@lib/util";
import { timestampToDateString } from "@lib/util/date";
import { getMIMEType } from "@lib/util/mime";
import { DecryptionProcessor } from "@lib/workers/decrypt-stream";
import DecryptionProcessorWorker from "@lib/workers/decrypt-stream?worker";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";
import { useSettings } from "@components/settings/context";

import { useJobsManager } from "./jobs/context";

/**
 * Delay, in milliseconds, to allow the UI to update and show the "tap" animations when navigating
 * into a directory.
 */
const NAVIGATION_DELAY = 75;

type FileLikePartial = Partial<FileLike> & Partial<Omit<File, "type">>;
export interface ContainerProps extends FileLikePartial {
    /** The ID of the directory item */
    id?: string;
    /** Whether the item should be disabled */
    disabled?: boolean;
    /** Whether the item is on an even row */
    oddRow: boolean;
    /** Whether to keep the `.exef` extension when displaying the name */
    keepExEF?: boolean;
    /** Whether to show the ellipsis menu */
    ellipsisMenuEnabled?: boolean;
    /** Optional override for the click handler */
    onClickItemOverride?: (fullpath: string) => void;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isLoading = props.type === undefined;
    const isFile = props.type === "file";
    const nameNoExEF = props.name?.replace(/\.exef$/, "");
    const ellipsisMenuEnabled = props.ellipsisMenuEnabled ?? props.type !== "parent";
    const mimetype = props.name ? getMIMEType(props.name) : null;

    // Contexts
    const auth = useAuth();
    const settings = useSettings();
    const router = useIonRouter();
    const jobsManager = useJobsManager();
    const explorerContext = useExplorerContext();

    // Functions
    /**
     * Handles the user clicking on an item.
     */
    async function onClickItem() {
        if (props.onClickItemOverride) {
            props.onClickItemOverride(props.fullpath!);
            return;
        }

        if (!isFile) {
            // Navigate into the directory
            setTimeout(() => {
                router.push(`/files/${props.fullpath}`, props.type !== "parent" ? "forward" : "back", "push");
            }, NAVIGATION_DELAY);
            return;
        }

        const fileName = nameNoExEF!;

        /**
         * Handles the file download process.
         */
        async function _handleDownload() {
            // Create new job
            const jobID = randID();
            const controller = new AbortController();
            const signal = controller.signal;

            jobsManager.addJob(jobID, {
                direction: "download",
                name: fileName, // This is the deobfuscated name
                description: "Downloading...",
                progress: null,
                controller: controller,
            });

            if (Capacitor.getPlatform() === "web") {
                explorerContext.presentSnackbar("Downloading...");
            }
            console.debug(`Created new job for '${fileName}' with id '${jobID}'`);

            try {
                // Send request for file
                const response = await downloadFile(auth, props.fullpath!, signal);
                if (!response.success) {
                    explorerContext.presentSnackbar(`Failed to get file: ${response.error}`, "danger");
                    throw new Error(response.error); // Propagate error to outer try-catch
                }

                const fileSize = response.fileSize! - ExEF.additionalSize;

                if (signal.aborted) throw new Error("Cancelled");

                // Create stream that handles the decryption and updates the progress
                const worker = new DecryptionProcessorWorker();
                const processor = Comlink.wrap<DecryptionProcessor>(worker);

                jobsManager.updateJob(jobID, "Decrypting...", 0, worker);

                let fileDataBlob: Blob;
                try {
                    fileDataBlob = await processor.processStream(
                        // `transfer()` moves datastream ownership to the worker instead of trying to clone it
                        Comlink.transfer(response.dataStream!, [response.dataStream!]),
                        auth.vaultKey!,
                        response.e2ee ? auth.authInfo!.key! : null,
                        fileSize,
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

                    const err = e as Error;
                    if (err.message.includes("header MAC")) {
                        explorerContext.presentSnackbar(`Failed to decrypt file: vault key may be incorrect`, "danger");
                    } else {
                        explorerContext.presentSnackbar(`Failed to decrypt file: ${err.message}`, "danger");
                    }
                    throw e; // Propagate error to outer try-catch
                } finally {
                    // Free up resources
                    worker.terminate();
                }

                if (signal.aborted) throw new Error("Cancelled");

                // Save file
                jobsManager.updateJob(jobID, "Saving...", null); // Must specify null to reset progress
                console.debug(`Saving file ${fileName}...`);
                try {
                    if (Capacitor.getPlatform() === "web") {
                        // Create a new a element to download the file
                        const a = document.createElement("a");
                        const url = URL.createObjectURL(fileDataBlob);
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function () {
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                        }, 0);
                        explorerContext.presentSnackbar("File downloaded", "success");
                    } else {
                        // Write file to documents folder
                        await writeBlob({
                            path: `Excalibur/${fileName}`,
                            directory: Directory.Documents,
                            blob: fileDataBlob,
                            recursive: true,
                            on_fallback(error) {
                                console.error(error);
                            },
                        });
                        explorerContext.presentSnackbar("File saved to the documents folder", "success");
                    }
                } catch (e) {
                    explorerContext.presentSnackbar(`Failed to save file: ${(e as Error).message}`, "danger");
                }
            } catch (e) {
                const err = e as Error;
                if (err.message == "Cancelled" || err.name === "AbortError") {
                    console.debug(`Job '${jobID}' (download) cancelled`);
                    return;
                }
                console.error(err);
            } finally {
                jobsManager.deleteJob(jobID);
            }
        }

        // If on mobile, check if the file already exists
        if (Capacitor.getPlatform() !== "web") {
            try {
                await Filesystem.stat({
                    path: `Excalibur/${fileName}`,
                    directory: Directory.Documents,
                });

                // If no error was thrown, that means that the file already exists on device
                explorerContext.presentAlert({
                    header: "File already exists",
                    message: "Do you want to override the existing file?",
                    buttons: [
                        {
                            text: "No",
                            role: "cancel",
                            handler: () => {
                                explorerContext.presentSnackbar("Download cancelled", "warning");
                            },
                        },
                        {
                            text: "Yes",
                            role: "confirm",
                            handler: () => {
                                _handleDownload();
                                explorerContext.dismissAlert();
                            },
                        },
                    ],
                });
                return;
            } catch {
                // File does not exist; nothing else to do
            }
        }

        _handleDownload();
    }

    /**
     * Handles the user clicking the rename button on an item.
     */
    async function onClickRename() {
        await explorerContext.onRename(props.fullpath!, !isFile);
        dismissPopover();
    }

    /**
     * Handles the user clicking the move button on an item.
     */
    async function onClickMove() {
        await explorerContext.onMove(props.fullpath!);
        dismissPopover();
    }

    /**
     * Handles the user clicking the delete button on an item.
     */
    async function onClickDelete() {
        await explorerContext.onDelete(props.fullpath!, !isFile);
        dismissPopover();
    }

    // Render
    const lighter = "[--background:var(--ion-background-color)]";
    const darker =
        "light:[--background:var(--ion-background-color-step-100)] dark:[--background:var(--ion-background-color-step-50)] ";
    let rowColourClass;
    switch (settings.rowAlternatingColours) {
        case "off":
            rowColourClass = lighter;
            break;
        case "normal":
            rowColourClass = props.oddRow ? lighter : darker;
            break;
        case "inverted":
            rowColourClass = props.oddRow ? darker : lighter;
            break;
    }

    let icon;
    switch (props.type) {
        case "file":
            icon = mimetypeToIcon(mimetype ? mimetype : "unknown/unknown", settings.iconStyle);
            break;
        case "directory":
            icon = getIcon("folder", settings.iconStyle);
            break;
        case "parent":
            icon = getIcon("returnUpBack", settings.iconStyle);
            break;
    }

    const Popover = () => (
        <IonContent>
            <IonList lines="none" className="h-full [&_ion-label]:flex [&_ion-label]:items-center">
                <IonItem button={true} onClick={() => onClickRename()}>
                    <IonLabel>
                        <IonIcon icon={pencilOutline} size="large" />
                        <IonText className="pl-2">Rename</IonText>
                    </IonLabel>
                </IonItem>
                <IonItem button={true} onClick={() => onClickMove()}>
                    <IonLabel>
                        <IonIcon icon={moveOutline} size="large" />
                        <IonText className="pl-2">Move</IonText>
                    </IonLabel>
                </IonItem>
                <IonItem button={true} onClick={() => onClickDelete()}>
                    <IonLabel>
                        <IonIcon icon={trashOutline} size="large" />
                        <IonText className="pl-2">Delete</IonText>
                    </IonLabel>
                </IonItem>
            </IonList>
        </IonContent>
    );
    const [showPopover, dismissPopover] = useIonPopover(Popover);
    return (
        <IonItem id={props.id} className={rowColourClass} button={!props.disabled && !isLoading}>
            {/* Main item content */}
            <div className="flex h-16 w-full items-center" data-name={nameNoExEF}>
                <IonGrid
                    className="w-full"
                    onClick={!props.disabled && !isLoading ? onClickItem : undefined}
                    onContextMenu={(e) => {
                        if (props.disabled || isLoading || !ellipsisMenuEnabled) return;
                        e.preventDefault();
                        showPopover({ event: e.nativeEvent, reference: "event", side: "bottom" });
                    }}
                >
                    <IonRow className="ion-align-items-center">
                        <IonCol className="flex items-center">
                            <IonThumbnail className="size-6 *:size-full">
                                {!isLoading && <IonIcon icon={icon} color={props.disabled ? "light" : undefined} />}
                                {isLoading && <IonSkeletonText animated={true} />}
                            </IonThumbnail>
                            <div className="w-[calc(100%-var(--spacing)*10)] pl-4 *:block">
                                <IonLabel className="max-w-100 truncate" color={props.disabled ? "light" : undefined}>
                                    {!isLoading &&
                                        (props.type === "directory" || props.keepExEF ? props.name : nameNoExEF)}
                                    {isLoading && <IonSkeletonText animated={true}></IonSkeletonText>}
                                </IonLabel>
                                {!isLoading && props.size !== undefined && (
                                    <IonNote className="text-sm" color={props.disabled ? "medium" : undefined}>
                                        {bytesToHumanReadable(props.size, settings.fileSizeUnits)}
                                    </IonNote>
                                )}
                                {!isLoading && props.creation_time !== undefined && (
                                    <IonNote className="text-xs" color={props.disabled ? "dark" : undefined}>
                                        {timestampToDateString(props.creation_time!)}
                                    </IonNote>
                                )}
                                {isLoading && <IonSkeletonText animated={true}></IonSkeletonText>}
                            </div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </div>

            {!props.disabled && !isLoading && ellipsisMenuEnabled && (
                <IonButtons className="m-0 size-12 justify-end" slot="end">
                    {/* Ellipsis menu button */}
                    <IonButton onClick={(e) => showPopover({ event: e.nativeEvent })}>
                        <IonIcon size="small" slot="icon-only" icon={ellipsisVertical} />
                    </IonButton>
                </IonButtons>
            )}
        </IonItem>
    );
};

export default DirectoryItem;
