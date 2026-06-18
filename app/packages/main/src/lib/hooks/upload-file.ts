import { Filesystem } from "@capacitor/filesystem";
import { FilePicker, PickedFile } from "@capawesome/capacitor-file-picker";
import * as Comlink from "comlink";
import { DragEvent } from "react";

import { randID } from "@lib/auth/util";
import { checkPath, mkdir, uploadFile } from "@lib/files/api";
import { getAllFileEntries } from "@lib/files/webkit";
import { b64decode, getBaseName, getParent, getParents } from "@lib/util";
import { EncryptionProcessor } from "@lib/workers/encrypt-stream";
import EncryptionProcessorWorker from "@lib/workers/encrypt-stream?worker";

import { useAuth } from "@components/auth/context";
import { useExplorerContext } from "@components/explorer/context";
import { useJobsManager } from "@components/explorer/jobs/context";
import { useSettings } from "@components/settings/context";

type UploadFile = PickedFile & { rawName: string; directory?: string };

export function useUploadFile() {
    // Contexts
    const auth = useAuth();
    const settings = useSettings();
    const jobsManager = useJobsManager();
    const explorerContext = useExplorerContext();

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
                name: rawFile.rawName,
                description: "Setting up data stream...",
                progress: null,
                controller: controller,
            });
            console.debug(`Created new job for '${rawFile.rawName}' with id '${jobID}'`);

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
                                        explorerContext.presentSnackbar("Failed to read file chunk", "danger");
                                        jobsManager.deleteJob(jobID);
                                        controller.error(err);
                                        return;
                                    }

                                    if (chunk === null || (chunk!.data as string).length === 0) {
                                        // File completely read
                                        controller.close();
                                        return;
                                    }

                                    controller.enqueue(b64decode(chunk.data as string));
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
                        auth.vaultKey!, // FIXME: Sometimes, in Cypress, this is undefined
                        auth.authInfo!.key!,
                        rawFileSize,
                        settings.cryptoKeyStrength,
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
                    explorerContext.presentSnackbar(`Failed to encrypt file: ${(e as Error).message}`, "danger");
                    throw e;
                } finally {
                    // Free up resources
                    signal.removeEventListener("abort", abortHandler);
                    worker.terminate();
                }

                if (signal.aborted) throw new Error("Cancelled");

                // Obfuscate the file name if necessary
                const name = rawFile.name;

                // Upload the file
                console.debug(`Uploading file '${rawFile.name}' ('${name}.exef')...`);
                jobsManager.updateJob(jobID, "Uploading...", null); // Must specify null to reset progress
                const file = new File([blob], name + ".exef");
                console.log("Upload path:", explorerContext.path + (rawFile.directory ? "/" + rawFile.directory : ""));
                const uploadResponse = await uploadFile(
                    auth,
                    explorerContext.path + (rawFile.directory ? "/" + rawFile.directory : ""),
                    file,
                    signal,
                    (progress) => {
                        if (!signal.aborted) {
                            jobsManager.updateProgress(jobID, progress);
                        }
                    },
                ); // Always force upload
                if (!uploadResponse.success) {
                    explorerContext.presentSnackbar(`Failed to upload file: ${uploadResponse.error}`, "danger");
                    throw new Error(uploadResponse.error);
                }
            } catch (e) {
                const err = e as Error;
                if (err.message == "Cancelled" || err.name === "AbortError") {
                    console.debug(`Job '${jobID}' (upload) cancelled`);
                    return;
                }
                console.error(err);
                jobsManager.updateJob(jobID, "Failed", false);
                return;
            }

            jobsManager.updateJob(jobID, "Complete", true);
        }

        if (!files) {
            // Get file picker to let user choose the files
            try {
                const pickedFiles = (await FilePicker.pickFiles()).files;
                files = pickedFiles.map((item) => {
                    const name = auth.authInfo!.obfuscatedNames
                        ? auth.noc!.encipher(Buffer.from(item.name, "utf-8"))
                        : item.name;
                    return { ...item, name, rawName: item.name };
                });
            } catch (e: unknown) {
                const message = (e as Error).message;
                if (message.includes("pickFiles canceled")) {
                    console.debug("Cancelled upload of file");
                    return;
                }
                explorerContext.presentSnackbar(`Failed to pick file: ${message}`, "danger");
                return;
            }
        }

        // Upload all files
        explorerContext.presentSnackbar(`Uploading${files.length === 1 ? "" : ` ${files.length} files`}...`);
        for (const file of files) {
            // Check if file size acceptable
            if (file.size > auth.serverInfo!.maxUploadSize) {
                // We use an alert to make it more visible
                console.warn(`File '${file.name}' is too large (${file.size} > ${auth.serverInfo!.maxUploadSize})`);
                alert(`File '${file.name}' is too large (max ${auth.serverInfo!.maxUploadSize} bytes)`);
                continue;
            }

            // Check if containing directories exist
            if (file.directory) {
                const dirs = getParents(explorerContext.path + "/" + file.directory + "/x") // "/x" to add target dir
                    .toReversed() // To get from root to target
                    .slice(1); // Remove the last element (the "/x")

                for (const dir of dirs) {
                    const checkDirResponse = await checkPath(auth, dir);
                    if (checkDirResponse.success) {
                        // Directory exists, continue
                    } else if (checkDirResponse.error === "Path not found") {
                        // Make directory
                        const createDirResponse = await mkdir(auth, getParent(dir), getBaseName(dir), false);
                        if (!createDirResponse.success) {
                            explorerContext.presentSnackbar(
                                `Failed to create containing directory: ${createDirResponse.error}`,
                                "danger",
                            );
                            return;
                        }
                    } else {
                        explorerContext.presentSnackbar(
                            `Failed to check containing directory: ${checkDirResponse.error}`,
                            "danger",
                        );
                        return;
                    }
                }
            }

            // Check if file exists
            const filePath = file.directory ? `${file.directory}/${file.name}` : file.name;
            const eventualPath = `${explorerContext.path}/${filePath}` + ".exef"; // The uploaded file has this extension
            const checkResponse = await checkPath(auth, eventualPath);
            if (!checkResponse.success) {
                switch (checkResponse.error) {
                    case "Path not found":
                        // This is good -- the file doesn't exist, so we can just carry on
                        break;
                    case "Illegal or invalid path":
                        explorerContext.presentSnackbar("Illegal or invalid file name", "danger");
                        return;
                    case "Path too long":
                        explorerContext.presentSnackbar("File path too long", "danger");
                        return;
                    default:
                        explorerContext.presentSnackbar(`Failed to check file path: ${checkResponse.error}`, "danger");
                        return;
                }
            }
            if (checkResponse.success && checkResponse.type === "file") {
                // File exists, ask if want to override
                console.debug(`File already exists at '${eventualPath}'; asking if want to override`);

                let haltUploads = false;
                await new Promise<void>((resolve) => {
                    explorerContext.presentAlert({
                        header: `${file.rawName} already exists`,
                        message: "Do you want to override the existing file?",
                        onDidDismiss: () => {
                            resolve();
                        },
                        buttons: [
                            {
                                text: "No",
                                role: "cancel",
                                handler: () => {
                                    explorerContext.presentSnackbar("File upload cancelled", "warning");
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
                // Handle name obfuscation as necessary
                let fileName = item.file.name;
                let fileDirectory = item.path ? getParent(item.path.replace(/^\//, "")) : undefined;
                if (auth.authInfo!.obfuscatedNames) {
                    fileName = auth.noc!.encipher(Buffer.from(fileName, "utf-8"));
                    if (fileDirectory) {
                        const slashObfuscated = auth.noc!.encipher(Buffer.from("/", "utf-8"));
                        fileDirectory = auth
                            .noc!.encipher(Buffer.from(fileDirectory, "utf-8"))
                            .replaceAll(slashObfuscated, "/"); // Do not obfuscate slashes
                    }
                }

                // Create instance
                return {
                    name: fileName,
                    rawName: item.file.name,
                    size: item.file.size,
                    mimeType: item.file.type,
                    blob: item.file,
                    directory: fileDirectory,
                } as UploadFile;
            }),
        );
    }

    return { onUploadFile, onDropFileItem };
}
