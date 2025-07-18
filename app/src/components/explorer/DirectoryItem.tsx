import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
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
import { documentTextOutline, folderOutline, trashOutline } from "ionicons/icons";

import ExEF from "@lib/exef";
import { downloadFile } from "@lib/files/api";
import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable, updateAndYield } from "@lib/util";

import { useAuth } from "@components/auth/ProvideAuth";

interface ContainerProps extends FileLike {
    /** Size of the item, in bytes */
    size?: number;
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
     * Handles the user clicking on a directory item.
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

        // Decrypt file
        props.setDialogMessage("Downloading and decrypting...");
        props.setProgress(0);
        const fileDataStream = ExEF.decryptStream(auth.vaultKey!, response.dataStream!);
        const reader = fileDataStream.getReader();
        let fileData: Buffer = Buffer.from([]);
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                fileData = Buffer.concat([fileData, value]);

                // FIXME: `updateAndYield` seems to block the reading here, causing the download to
                //        hang for a while before actually 'committing', especially for larger files
                //        (>10 MB). Can we use `comlink` to set up a worker thread to handle this?
                await updateAndYield(fileData.length / fileSize, props.setProgress);

                console.debug(
                    `Downloaded ${fileData.length} / ${fileSize} (${((fileData.length / fileSize) * 100).toFixed(2)}%)`,
                );
            }
        } catch (e: any) {
            props.presentToast({
                message: `Failed to decrypt file: ${e.message}`,
                duration: 2000,
                color: "danger",
            });
            props.setShowDialog(false);
            return;
        }

        // Save file
        props.setDialogMessage("Saving...");
        props.setProgress(null);
        const fileName = props.name.replace(".exef", "");
        console.debug(`Saving file ${fileName}...`);
        if (Capacitor.getPlatform() === "web") {
            // Create a new a element to download the file
            const a = document.createElement("a");
            const url = URL.createObjectURL(new Blob([fileData]));
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
            await Filesystem.writeFile({
                path: `Excalibur/${fileName}`,
                data: fileData.toString("base64"),
                directory: Directory.Documents,
                recursive: true,
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
     * Handles the user clicking the delete button on a directory item.
     *
     * Calls the {@link onDelete} callback with the path of the item and whether it is a directory.
     */
    async function onClickDelete() {
        await props.onDelete(props.fullpath, !isFile);
        slideRef.current?.close();
    }

    // Render
    return (
        <IonItemSliding ref={slideRef} className="w-full">
            {/* Main item content */}
            <IonItem button={true} onClick={() => onClickItem()}>
                <div className="flex h-16 w-full items-center">
                    <IonGrid>
                        <IonRow className="ion-align-items-center">
                            <IonCol className="flex items-center">
                                <IonIcon className="size-6" icon={isFile ? documentTextOutline : folderOutline} />
                                <div className="pl-4">
                                    <IonLabel>{props.name}</IonLabel>
                                    {props.size !== undefined && <IonNote>{bytesToHumanReadable(props.size)}</IonNote>}
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
    );
};

export default DirectoryItem;
