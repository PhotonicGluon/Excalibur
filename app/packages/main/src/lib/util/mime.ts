import mime from "mime";

/**
 * Gets the MIME type for a given file name.
 *
 * @param filename the file name to get the MIME type for
 * @returns the MIME type, or null if the MIME type could not be determined.
 */
export function getMIMEType(filename: string) {
    return mime.getType(filename || "");
}
