import mime from "mime";

/**
 * Gets the MIME type for a given file name.
 *
 * @param filename the file name to get the MIME type for. This could include the `.exef` extension
 * @returns the MIME type, or null if the MIME type could not be determined.
 */
export function getMIMEType(filename: string) {
    const nameNoExEF = filename.replace(/\.exef$/, "");
    const mimetype = mime.getType(nameNoExEF || "");
    return mimetype;
}
