import { AuthProvider } from "@contexts/auth";

/**
 * Checks if a path exists.
 *
 * @param auth The current authentication provider.
 * @param path The path to check.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or the type of the path.
 */
export async function checkPath(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; type?: "file" | "directory" }> {
    const response = await fetch(`${auth.apiURL}/files/check/path/${path}`, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 404:
            return { success: false, error: "Path not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, type: response.status === 200 ? "file" : "directory" };
}

/**
 * Checks if a file is too large to be uploaded.
 *
 * @param auth The current authentication provider.
 * @param size The size of the file to check.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message or a boolean indicating whether the file is too large.
 */
export async function checkSize(
    auth: AuthProvider,
    size: number,
): Promise<{ success: boolean; error?: string; isTooLarge?: boolean }> {
    const response = await fetch(`${auth.apiURL}/files/check/size?size=${size}`, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 416:
            // Continue with normal flow
            break;
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, isTooLarge: response.status === 416 };
}

/**
 * Checks the existence of a directory, and whether it is empty.
 *
 * @param auth The current authentication provider.
 * @param path The path to check.
 * @returns A promise which resolves to an object with a success boolean and optionally an error
 *      message.
 */
export async function checkDir(
    auth: AuthProvider,
    path: string,
): Promise<{ success: boolean; error?: string; isEmpty?: boolean }> {
    const response = await fetch(`${auth.apiURL}/files/check/dir/${path}`, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${auth.token}` },
    });
    switch (response.status) {
        case 200:
            // Continue with normal flow
            break;
        case 202:
            // Continue with normal flow
            break;
        case 401:
            return { success: false, error: "Unauthorized" };
        case 404:
            return { success: false, error: "Directory not found" };
        case 406:
            return { success: false, error: "Illegal or invalid path" };
        default:
            return { success: false, error: "Unknown error" };
    }

    return { success: true, isEmpty: response.status === 200 };
}
