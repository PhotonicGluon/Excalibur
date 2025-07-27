import {
    codeOutline,
    documentOutline,
    documentTextOutline,
    fileTrayFullOutline,
    filmOutline,
    imageOutline,
    imagesOutline,
    musicalNotesOutline,
} from "ionicons/icons";

/**
 * Maps MIME types to icons.
 */
const MIMETYPE_TO_ICON: Record<string, string> = {
    // Applications
    "application/octet-stream": codeOutline, // Any kind of binary data
    "application/json": codeOutline,
    "application/pdf": documentTextOutline,
    "application/zip": fileTrayFullOutline,

    // Audio
    "audio/aac": musicalNotesOutline,
    "audio/mpeg": musicalNotesOutline,
    "audio/ogg": musicalNotesOutline,
    "audio/wav": musicalNotesOutline,

    // Images
    "image/apng": imagesOutline, // Animated Portable Network Graphics (APNG)
    "image/avif": imageOutline, // AV1 Image File Format (AVIF)
    "image/bmp": imageOutline,
    "image/gif": imagesOutline,
    "image/png": imageOutline,
    "image/jpeg": imageOutline,
    "image/svg+xml": imagesOutline,
    "image/tiff": imageOutline, // Tagged Image File Format (TIFF)
    "image/webp": imageOutline,

    // Texts
    "text/csv": documentTextOutline,
    "text/markdown": documentTextOutline,
    "text/plain": documentTextOutline,

    // Video
    "video/mp4": filmOutline,
    "video/mpeg": filmOutline,
    "video/x-msvideo": filmOutline, // AVI: Audio Video Interleave
};

/**
 * Converts a MIME type to an icon.
 *
 * @param mimetype The MIME type to convert
 * @returns The icon corresponding to the MIME type. If the MIME type is not found, returns the
 *      document outline icon
 */
export function mimetypeToIcon(mimetype?: string) {
    if (!mimetype) {
        return documentOutline;
    }
    return MIMETYPE_TO_ICON[mimetype] || documentOutline;
}
