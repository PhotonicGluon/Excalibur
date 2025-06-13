import { Device } from "@capacitor/device";
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
import { documentTextOutline, folderOutline, trashOutline } from "ionicons/icons";

import { decrypt } from "@lib/crypto";
import { ExEF } from "@lib/exef";
import { downloadFile } from "@lib/files/api";
import { FileLike } from "@lib/files/structures";
import { bytesToHumanReadable } from "@lib/util";

import { useAuth } from "@components/auth/ProvideAuth";

interface ContainerProps extends FileLike {
    /** Size of the item, in bytes */
    size?: number;
    /** Function to call when deletion is requested */
    onDelete: (path: string, isDir: boolean) => Promise<void>;
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

        // Send request for file
        const response = await downloadFile(auth, props.fullpath);
        if (!response.success) {
            // TODO: Raise toast
            console.error(response.error);
            return;
        }

        // Download encrypted file
        const data = response.data!;
        const encryptedFileData = Buffer.from(data);

        // Decrypt file
        const exef = ExEF.fromBuffer(encryptedFileData);
        const fileData = decrypt(exef, auth.vaultKey!);

        // Save file
        const info = await Device.getInfo();
        if (info.platform === "web") {
            // Create a new a element to download the file
            const a = document.createElement("a");
            const url = URL.createObjectURL(new Blob([fileData]));
            a.href = url;
            a.download = props.name.replace(".exef", "");
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        } else {
            // TODO: Handle save on mobile
        }
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
        <div className="flex h-16 w-full items-center">
            <IonItemSliding ref={slideRef} className="w-full">
                {/* Main item content */}
                <IonItem button={true} onClick={() => onClickItem()}>
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
