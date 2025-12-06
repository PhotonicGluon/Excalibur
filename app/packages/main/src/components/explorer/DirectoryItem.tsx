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
    IonText,
    useIonPopover,
    useIonRouter,
} from "@ionic/react";
import { ellipsisVertical, pencilOutline, trashOutline } from "ionicons/icons";

import ExEF from "@lib/exef";
import { downloadFile } from "@lib/files/api";
import { File, FileLike } from "@lib/files/structures";
import { getIcon, mimetypeToIcon } from "@lib/icons";
import { randID } from "@lib/security/util";
import { bytesToHumanReadable } from "@lib/util";
import { DecryptionProcessor } from "@lib/workers/decrypt-stream";
import DecryptionProcessorWorker from "@lib/workers/decrypt-stream?worker";

import { useAuth } from "@components/auth/context";
import { useUIFeedback } from "@components/explorer/context";
import { useSettings } from "@components/settings/context";

type FileLikePartial = FileLike & Partial<Omit<File, "type">>;
export interface ContainerProps extends FileLikePartial {
    /** The ID of the directory item */
    id?: string;
    /** Whether the item is on an even row */
    oddRow: boolean;
    /** Whether to keep the `.exef` extension when displaying the name */
    keepExEF?: boolean;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isFile = props.type === "file";
    const nameNoExEF = props.name.replace(/\.exef$/, "");

    // Contexts
    const auth = useAuth();
    const settings = useSettings();
    const router = useIonRouter();
    const uiFeedback = useUIFeedback();

    // Functions
    /**
     * Handles the user clicking on an item.
     */
    async function onClickItem() {
        if (!isFile) {
            // Navigate into the directory
            router.push(`/files/${props.fullpath}`, props.type !== "parent" ? "forward" : "back", "push");
            return;
        }

        const fileName = nameNoExEF;

        /**
         * Handles the file download process.
         */
        async function _handleDownload() {
            // Create new job
            const jobID = randID();
            const controller = new AbortController();
            const signal = controller.signal;

            uiFeedback.jobsManager.addJob(jobID, {
                direction: "download",
                filename: fileName,
                description: "Downloading...",
                progress: null,
                controller: controller,
            });

            if (Capacitor.getPlatform() === "web") {
                uiFeedback.presentToast({
                    message: "Downloading...",
                    duration: 2000,
                    color: "primary",
                });
            }
            console.debug(`Created new job for '${fileName}' with id '${jobID}'`);

            try {
                // Send request for file
                const response = await downloadFile(auth, props.fullpath, signal);
                if (!response.success) {
                    uiFeedback.presentToast({
                        message: `Failed to get file: ${response.error}`,
                        duration: 2000,
                        color: "danger",
                    });
                    throw new Error(response.error); // Propagate error to outer try-catch
                }

                const fileSize = response.fileSize! - ExEF.additionalSize;

                if (signal.aborted) throw new Error("Cancelled");

                // Create stream that handles the decryption and updates the progress
                const worker = new DecryptionProcessorWorker();
                const processor = Comlink.wrap<DecryptionProcessor>(worker);

                uiFeedback.jobsManager.updateJob(jobID, "Decrypting...", 0, worker);

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
                                uiFeedback.jobsManager.updateProgress(jobID, progress);
                            }
                        }),
                    );
                } catch (e) {
                    if (signal.aborted) throw new Error("Cancelled");

                    const err = e as Error;
                    if (err.message.includes("header MAC")) {
                        uiFeedback.presentToast({
                            message: `Failed to decrypt file: vault key may be incorrect`,
                            duration: 2000,
                            color: "danger",
                        });
                    } else {
                        uiFeedback.presentToast({
                            message: `Failed to decrypt file: ${err.message}`,
                            duration: 2000,
                            color: "danger",
                        });
                    }
                    throw e; // Propagate error to outer try-catch
                } finally {
                    // Free up resources
                    worker.terminate();
                }

                if (signal.aborted) throw new Error("Cancelled");

                // Save file
                uiFeedback.jobsManager.updateJob(jobID, "Saving...", null); // Must specify null to reset progress
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
                        uiFeedback.presentToast({
                            message: "File downloaded",
                            duration: 2000,
                            color: "success",
                        });
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
                        uiFeedback.presentToast({
                            message: "File saved to the documents folder",
                            duration: 2000,
                            color: "success",
                        });
                    }
                } catch (e) {
                    uiFeedback.presentToast({
                        message: `Failed to save file: ${(e as Error).message}`,
                        duration: 2000,
                        color: "danger",
                    });
                }
            } catch (e) {
                const err = e as Error;
                if (err.message == "Cancelled" || err.name === "AbortError") {
                    console.debug(`Job '${jobID}' (download) cancelled`);
                    return;
                }
            } finally {
                uiFeedback.jobsManager.deleteJob(jobID);
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
                uiFeedback.presentAlert({
                    header: "File already exists",
                    message: "Do you want to override the existing file?",
                    buttons: [
                        {
                            text: "No",
                            role: "cancel",
                            handler: () => {
                                uiFeedback.presentToast({
                                    message: "Download cancelled",
                                    duration: 2000,
                                    color: "warning",
                                });
                            },
                        },
                        {
                            text: "Yes",
                            role: "confirm",
                            handler: () => {
                                _handleDownload();
                                uiFeedback.dismissAlert();
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
     * Handles the user clicking the rename button an item.
     */
    async function onClickRename() {
        await uiFeedback.onRename(props.fullpath, !isFile);
        dismissPopover();
    }

    /**
     * Handles the user clicking the delete button an item.
     */
    async function onClickDelete() {
        await uiFeedback.onDelete(props.fullpath, !isFile);
        dismissPopover();
    }

    // Render
    const lighter = "[--background:#ffffff] dark:[--background:var(--ion-background-color)]";
    const darker = "[--background:var(--ion-color-light)] dark:[--background:var(--ion-background-color-step-50)]";
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
            icon = mimetypeToIcon(props.mimetype, settings.iconStyle);
            break;
        case "directory":
            icon = getIcon("folder", settings.iconStyle);
            break;
        case "parent":
            icon = getIcon("returnUpBack", settings.iconStyle);
            break;
    }

    const Popover = () =>
        props.type !== "parent" && (
            <IonContent>
                <IonList lines="none" className="h-full [&_ion-label]:flex [&_ion-label]:items-center">
                    <IonItem button={true} onClick={() => onClickRename()}>
                        <IonLabel>
                            <IonIcon icon={pencilOutline} size="large" />
                            <IonText className="pl-2">Rename</IonText>
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
        <IonItem id={props.id} className={rowColourClass} button={true}>
            {/* Main item content */}
            <div className="flex h-16 w-full items-center" data-name={nameNoExEF}>
                <IonGrid
                    className="w-full"
                    onClick={() => onClickItem()}
                    onContextMenu={(e) => {
                        if (props.type === "parent") return;
                        e.preventDefault();
                        showPopover({ event: e.nativeEvent, reference: "event", side: "bottom" });
                    }}
                >
                    <IonRow className="ion-align-items-center">
                        <IonCol className="flex items-center">
                            <IonIcon className="size-6" icon={icon} />
                            <div className="w-[calc(100%-var(--spacing)*10)] pl-4">
                                <IonLabel className="max-w-100 truncate">
                                    {props.type === "directory" || props.keepExEF ? props.name : nameNoExEF}
                                </IonLabel>
                                {props.size !== undefined && (
                                    <IonNote>{bytesToHumanReadable(props.size, settings.fileSizeUnits)}</IonNote>
                                )}
                            </div>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </div>

            <IonButtons className="m-0 size-12 justify-end" slot="end">
                {/* Ellipsis menu button */}
                {props.type !== "parent" && (
                    <IonButton onClick={(e) => showPopover({ event: e.nativeEvent })}>
                        <IonIcon size="small" slot="icon-only" icon={ellipsisVertical} />
                    </IonButton>
                )}
            </IonButtons>
        </IonItem>
    );
};

export default DirectoryItem;
