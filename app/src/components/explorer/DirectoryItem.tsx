import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import write_blob from "capacitor-blob-writer";
import * as Comlink from "comlink";
import React, { useRef } from "react";

import {
    IonCol,
    IonGrid,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonLabel,
    IonNote,
    IonRow,
    useIonRouter,
} from "@ionic/react";
import { folderOutline, trashOutline } from "ionicons/icons";

import ExEF from "@lib/exef";
import { downloadFile } from "@lib/files/api";
import { File, FileLike } from "@lib/files/structures";
import { mimetypeToIcon } from "@lib/mimetypes";
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

    // Contexts
    const auth = useAuth();
    const settings = useSettings();
    const router = useIonRouter();
    const uiFeedback = useUIFeedback();

    // States
    const slideRef = useRef<HTMLIonItemSlidingElement>(null);

    // Functions
    /**
     * Handles the user clicking on an item.
     */
    async function onClickItem() {
        if (!isFile) {
            // Navigate into the directory
            router.push(`/files/${props.fullpath}`, "forward", "push");
            return;
        }

        const fileName = props.name.replace(".exef", "");

        /**
         * Actual function handling the download process.
         */
        async function handleDownload() {
            uiFeedback.setShowDialog(true);
            uiFeedback.setDialogMessage("Getting download stream...");
            uiFeedback.setProgress(null);

            // Send request for file
            // TODO: Stream file download, with chunk size management?
            const response = await downloadFile(auth, props.fullpath);
            if (!response.success) {
                uiFeedback.presentToast({
                    message: `Failed to get file: ${response.error}`,
                    duration: 2000,
                    color: "danger",
                });
                uiFeedback.setShowDialog(false);
                return;
            }

            // Compute final file size
            const encryptedFileSize = response.fileSize!;
            const fileSize = encryptedFileSize - ExEF.additionalSize;

            // Decrypt file using a Comlink worker
            uiFeedback.setDialogMessage("Downloading and decrypting...");
            uiFeedback.setProgress(0);

            const worker = new DecryptionProcessorWorker();
            const processor = Comlink.wrap<DecryptionProcessor>(worker);

            let fileData: Buffer = Buffer.from([]);
            try {
                fileData = await processor.processStream(
                    // `transfer()` moves datastream ownership to the worker instead of trying to clone it
                    Comlink.transfer(response.dataStream!, [response.dataStream!]),
                    auth.vaultKey!,
                    fileSize,
                    // `proxy()` ensures the callback function works across threads
                    Comlink.proxy(uiFeedback.setProgress),
                );
            } catch (e) {
                uiFeedback.presentToast({
                    message: `Failed to decrypt file: ${(e as Error).message}`,
                    duration: 2000,
                    color: "danger",
                });
                uiFeedback.setShowDialog(false);
                return;
            } finally {
                // Free up resources
                worker.terminate();
            }

            const fileDataBlob = new Blob([fileData]);

            // Save file
            uiFeedback.setDialogMessage("Saving...");
            uiFeedback.setProgress(null);
            console.debug(`Saving file ${fileName}...`);
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
                await write_blob({
                    path: `Excalibur/${fileName}`,
                    directory: Directory.Documents,
                    blob: fileDataBlob,
                    recursive: true,
                    on_fallback(error) {
                        console.error(error);
                    },
                });
                uiFeedback.presentToast({
                    message: "File downloaded to the documents folder",
                    duration: 2000,
                    color: "success",
                });
            }

            uiFeedback.setShowDialog(false);
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
                            handler: async () => await handleDownload(),
                        },
                    ],
                });
                return;
            } catch {
                // File does not exist; nothing else to do
            }
        }

        await handleDownload();
    }

    /**
     * Handles the user clicking the delete button an item.
     */
    async function onClickDelete() {
        await uiFeedback.onDelete(props.fullpath, !isFile);
        slideRef.current?.close();
    }

    // Render
    const lighter = "[--item-bg:#ffffff] dark:[--item-bg:var(--ion-background-color)]";
    const darker = "[--item-bg:var(--ion-color-light)] dark:[--item-bg:var(--ion-background-color-step-50)]";
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
    return (
        <div id={props.id} className={rowColourClass}>
            <IonItemSliding ref={slideRef} className="w-full bg-(--item-bg)">
                {/* Main item content */}
                <IonItem className="[--background:var(--item-bg)]" button={true} onClick={() => onClickItem()}>
                    <div className="flex h-16 w-full items-center">
                        <IonGrid>
                            <IonRow className="ion-align-items-center">
                                <IonCol className="flex items-center">
                                    <IonIcon
                                        className="size-6"
                                        icon={isFile ? mimetypeToIcon(props.mimetype) : folderOutline}
                                    />
                                    <div className="pl-4">
                                        <IonLabel className="max-w-92 truncate">
                                            {props.keepExEF ? props.name : props.name.replace(/\.exef$/, "")}
                                        </IonLabel>
                                        {props.size !== undefined && (
                                            <IonNote>
                                                {bytesToHumanReadable(props.size, settings.fileSizeUnits)}
                                            </IonNote>
                                        )}
                                    </div>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                    </div>
                </IonItem>

                {/* Slide options */}
                <IonItemOptions side="end">
                    <IonItemOption color="danger" onClick={() => onClickDelete()}>
                        <IonIcon slot="icon-only" icon={trashOutline}></IonIcon>
                    </IonItemOption>
                </IonItemOptions>
            </IonItemSliding>
        </div>
    );
};

export default DirectoryItem;
