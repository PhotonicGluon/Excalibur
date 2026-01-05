import { Filesystem } from "@capacitor/filesystem";
import { FilePicker, PickedFile } from "@capawesome/capacitor-file-picker";
import * as Comlink from "comlink";
import { DragEvent } from "react";

import { AlertOptions, Color } from "@ionic/core";
import { HookOverlayOptions } from "@ionic/react/dist/types/hooks/HookOverlayOptions";

import { checkPath, checkSize, mkdir, uploadFile } from "@lib/files/api";
import { getAllFileEntries } from "@lib/files/webkit";
import { randID } from "@lib/security/util";
import { getBaseName, getParent, getParents } from "@lib/util";
import { EncryptionProcessor } from "@lib/workers/encrypt-stream";
import EncryptionProcessorWorker from "@lib/workers/encrypt-stream?worker";

import { useAuth } from "@components/auth/context";
import { useJobsManager } from "@components/explorer/jobs/context";
import { useSettings } from "@components/settings/context";

type UploadFile = PickedFile & { directory?: string };

export function useUploadFile(
    path: string,
    presentAlert: (options: AlertOptions & HookOverlayOptions) => void,
    presentSnackbar: (message: string, colour?: Color) => void,
) {
    // Contexts
    const auth = useAuth();
    const settings = useSettings();
    const jobsManager = useJobsManager();

    // Functions
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
                    path + (rawFile.directory ? "/" + rawFile.directory : ""),
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
                let dirs = getParents(path + "/" + file.directory + "/redundant"); // So that the target directory is included
                dirs = dirs.toReversed().slice(1);
                console.log("Directories to create:", dirs);

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
            const eventualPath = `${path}/${filePath}` + ".exef"; // The uploaded file has this extension
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
    async function onDropFileItem(e: DragEvent) {
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
        const files: { file: File; path: string }[] = [];
        for await (const handle of items) {
            if (handle.entry.isDirectory) {
                console.log(`Dropped directory: ${handle.entry.name}`);

                const entries = await getAllFileEntries([handle.entry]);
                for (const entry of entries) {
                    const file = await new Promise<{ file: File; path: string }>((resolve, reject) => {
                        entry.file((fileObj) => {
                            resolve({ file: fileObj, path: entry.fullPath });
                        }, reject);
                    });
                    files.push(file);
                }
            } else {
                console.debug(`Dropped file: ${handle.entry.name}`);
                files.push({ file: handle.file, path: handle.entry.fullPath });
            }
        }

        // Call upload file method
        onUploadFile(
            files.map((item) => {
                return {
                    name: item.file.name,
                    size: item.file.size,
                    mimeType: item.file.type,
                    blob: item.file,
                    directory: item.path ? getParent(item.path.replace(/^\//, "")) : undefined,
                } as UploadFile;
            }),
        );
    }

    return { onUploadFile, onDropFileItem };
}
