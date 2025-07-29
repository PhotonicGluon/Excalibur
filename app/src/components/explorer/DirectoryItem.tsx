import { Capacitor } from "@capacitor/core";
import { Directory } from "@capacitor/filesystem";
import write_blob from "capacitor-blob-writer";
import * as Comlink from "comlink";
import React, { useRef } from "react";

import { ToastOptions } from "@ionic/core";
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

import { useAuth } from "@components/auth";

type FileLikePartial = FileLike & Partial<Omit<File, "type">>;
interface ContainerProps extends FileLikePartial {
    /** Whether the item is on an even row */
    oddRow: boolean;
    /** Whether to keep the `.exef` extension when displaying the name */
    keepExEF?: boolean;

    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
    /** Function to call when the dialog is closed */
    setShowDialog: (showing: boolean) => void;
    /** Set the message to be displayed in the dialog */
    setDialogMessage: (title: string) => void;
    /** Set the progress of the dialog */
    setProgress: (progress: number | null) => void;
    /** Present a toast */
    presentToast: (options: ToastOptions) => void;
}

const DirectoryItem: React.FC<ContainerProps> = (props: ContainerProps) => {
    const isFile = props.type === "file";

    // States
    const slideRef = useRef<HTMLIonItemSlidingElement>(null);
    const auth = useAuth();
    const router = useIonRouter();

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

        props.setShowDialog(true);
        props.setDialogMessage("Getting download stream...");
        props.setProgress(null);

        // Send request for file
        // TODO: Stream file download, with chunk size management?
        const response = await downloadFile(auth, props.fullpath);
        if (!response.success) {
            props.presentToast({
                message: `Failed to get file: ${response.error}`,
                duration: 2000,
                color: "danger",
            });
            props.setShowDialog(false);
            return;
        }

        // Compute final file size
        const encryptedFileSize = response.fileSize!;
        const fileSize = encryptedFileSize - ExEF.additionalSize;

        // Decrypt file using a Comlink worker
        props.setDialogMessage("Downloading and decrypting...");
        props.setProgress(0);

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
                Comlink.proxy(props.setProgress),
            );
        } catch (e) {
            props.presentToast({
                message: `Failed to decrypt file: ${(e as Error).message}`,
                duration: 2000,
                color: "danger",
            });
            props.setShowDialog(false);
            return;
        } finally {
            // Free up resources
            worker.terminate();
        }

        const fileDataBlob = new Blob([fileData]);

        // Save file
        props.setDialogMessage("Saving...");
        props.setProgress(null);
        const fileName = props.name.replace(".exef", "");
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
            props.presentToast({
                message: "File downloaded",
                duration: 2000,
                color: "success",
            });
        } else {
            // Write file to documents folder
            // TODO: Handle case where file already exists on the mobile
            await write_blob({
                path: `Excalibur/${fileName}`,
                directory: Directory.Documents,
                blob: fileDataBlob,
                recursive: true,
                on_fallback(error) {
                    console.error(error);
                },
            });
            props.presentToast({
                message: "File downloaded to the documents folder",
                duration: 2000,
                color: "success",
            });
        }

        props.setShowDialog(false);
    }

    /**
     * Handles the user clicking the delete button an item.
     */
    async function onClickDelete() {
        await props.onDelete(props.fullpath, !isFile);
        slideRef.current?.close();
    }

    // Render
    return (
        <div
            className={
                props.oddRow
                    ? "[--item-bg:theme(colors.neutral.50)] dark:[--item-bg:theme(colors.neutral.900)]"
                    : "[--item-bg:theme(colors.neutral.200)] dark:[--item-bg:inherit]"
            }
        >
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
                                        <IonLabel>
                                            {props.keepExEF ? props.name : props.name.replace(/\.exef$/, "")}
                                        </IonLabel>
                                        {props.size !== undefined && (
                                            <IonNote>{bytesToHumanReadable(props.size)}</IonNote>
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
