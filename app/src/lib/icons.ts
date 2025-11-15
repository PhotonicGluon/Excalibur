import * as icon from "ionicons/icons";

import { IconStyle } from "@lib/preferences/settings";

/** Collection of icons that can be used for files */
const ICONS = {
    code: {
        outline: icon.codeOutline,
        solid: icon.code,
    },
    document: {
        outline: icon.documentOutline,
        solid: icon.document,
    },
    documentText: {
        outline: icon.documentTextOutline,
        solid: icon.documentText,
    },
    fileTrayFull: {
        outline: icon.fileTrayFullOutline,
        solid: icon.fileTrayFull,
    },
    film: {
        outline: icon.filmOutline,
        solid: icon.film,
    },
    folder: {
        outline: icon.folderOutline,
        solid: icon.folder,
    },
    image: {
        outline: icon.imageOutline,
        solid: icon.image,
    },
    images: {
        outline: icon.imagesOutline,
        solid: icon.images,
    },
    musicalNotes: {
        outline: icon.musicalNotesOutline,
        solid: icon.musicalNotes,
    },
};
export type IconName = keyof typeof ICONS;

/**
 * Maps MIME types to icons.
 */
const MIMETYPE_TO_ICON: Record<string, IconName> = {
    // Applications
    "application/octet-stream": "code", // Any kind of binary data
    "application/json": "code",
    "application/pdf": "documentText",
    "application/zip": "fileTrayFull",

    // Audio
    "audio/aac": "musicalNotes",
    "audio/mpeg": "musicalNotes",
    "audio/ogg": "musicalNotes",
    "audio/wav": "musicalNotes",

    // Images
    "image/apng": "images", // Animated Portable Network Graphics (APNG)
    "image/avif": "image", // AV1 Image File Format (AVIF)
    "image/bmp": "image",
    "image/gif": "images",
    "image/png": "image",
    "image/jpeg": "image",
    "image/svg+xml": "images",
    "image/tiff": "image", // Tagged Image File Format (TIFF)
    "image/webp": "image",

    // Texts
    "text/csv": "documentText",
    "text/markdown": "documentText",
    "text/plain": "documentText",

    // Video
    "video/mp4": "film",
    "video/mpeg": "film",
    "video/x-msvideo": "film", // AVI: Audio Video Interleave
};

/**
 * Gets the icon to use based on the settings.
 *
 * This is specifically meant for the icons used for the files.
 *
 * @param icon The icon to get
 * @param iconStyle The icon style to use
 * @returns The icon's SVG string
 */
export function getIcon(icon: IconName, iconStyle?: IconStyle): string {
    if (!iconStyle) {
        iconStyle = "default";
    }

    // Handle folders differently (default to outline)
    if (icon === "folder") {
        if (iconStyle === "default" || iconStyle === "solid") {
            return ICONS.folder.solid;
        }
        return ICONS.folder.outline;
    }

    // All other icons should default to outline
    if (iconStyle === "default" || iconStyle === "outline") {
        return ICONS[icon].outline;
    }

    return ICONS[icon].solid;
}

/**
 * Converts a MIME type to an icon.
 *
 * @param mimetype The MIME type to convert
 * @param iconStyle The icon style to use
 * @returns The icon corresponding to the MIME type. If the MIME type is not found, returns the
 *      document outline icon
 */
export function mimetypeToIcon(mimetype?: string, iconStyle?: IconStyle) {
    if (!mimetype) {
        return getIcon("document", iconStyle);
    }
    return getIcon(MIMETYPE_TO_ICON[mimetype] || "document", iconStyle);
}
