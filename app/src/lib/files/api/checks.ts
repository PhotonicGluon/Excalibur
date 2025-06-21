import { AuthProvider } from "@components/auth/ProvideAuth";

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
    const response = await fetch(`${auth.apiURL}/files/check/${path}`, {
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
