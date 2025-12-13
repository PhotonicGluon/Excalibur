import { compareSemVer } from "semver-parser";

import packageInfo from "@root/package.json";

// Parse the package info to form the API url
const GITHUB_API_BASE_URL = packageInfo.repository.url
    .replace("git+", "")
    .replace(".git", "")
    .replace("github.com", "api.github.com/repos");

/**
 * Checks for updates.
 *
 * @returns A promise that resolves to an object containing whether an update is available, and, if
 *      so, the latest version and release URL
 */
export async function checkForUpdate(): Promise<{
    updateAvailable: boolean;
    latestVersion?: string;
    latestReleaseURL?: string;
}> {
    const latestReleaseInfo = await (await fetch(`${GITHUB_API_BASE_URL}/releases/latest`)).json();
    const latestVersion = latestReleaseInfo["tag_name"].replace("v", "");

    const currentVersion = packageInfo.version;
    if (compareSemVer(latestVersion, currentVersion) <= 0) {
        console.debug(`No update available (latest is ${latestVersion}, current is ${currentVersion})`);
        return { updateAvailable: false };
    }
    return { updateAvailable: true, latestVersion, latestReleaseURL: latestReleaseInfo["html_url"] };
}
