import { compareSemVer } from "semver-parser";

import { AlertOptions } from "@ionic/core";
import packageInfo from "@root/package.json";

import Preferences from "@lib/preferences";

// Parse the package info to form the API url
const GITHUB_API_BASE_URL = packageInfo.repository.url
    .replace("git+", "")
    .replace(".git", "")
    .replace("github.com", "api.github.com/repos");

const EXCALIBUR_CHANGELOG_URL = "https://excalibur.photonic.dev/changelog";

/**
 * Checks for updates.
 *
 * @returns A promise that resolves to an object containing whether an update is available, and, if
 *      so, the latest version (without the "v" prefix)
 */
async function checkForUpdate(): Promise<{
    updateAvailable: boolean;
    latestVersion?: string;
}> {
    const latestReleaseInfo = await (await fetch(`${GITHUB_API_BASE_URL}/releases/latest`)).json();
    const latestVersion = latestReleaseInfo["tag_name"].replace(/^v/, "");

    const currentVersion = packageInfo.version;
    if (compareSemVer(latestVersion, currentVersion) <= 0) {
        console.debug(`No update available (latest is ${latestVersion}, current is ${currentVersion})`);
        return { updateAvailable: false };
    }
    return { updateAvailable: true, latestVersion };
}

/**
 * Performs an update check and prompts the user to update if an update is available.
 *
 * @returns Whether an update is available and acted upon
 */
export async function performUpdateCheck(
    presentAlert: (options: AlertOptions) => Promise<void>,
    bypassIgnoreList: boolean = false,
): Promise<boolean> {
    // Retrieve list of ignored updates
    const ignoredUpdateVersionsRaw = (await Preferences.get("ignoredUpdateVersions")) ?? "";
    const ignoredUpdateVersions = ignoredUpdateVersionsRaw === "" ? [] : ignoredUpdateVersionsRaw.split(",");

    // Perform update check
    const updateCheckResponse = await checkForUpdate();
    if (!updateCheckResponse.updateAvailable) {
        return false;
    }

    // Check if this is an ignored version
    if (!bypassIgnoreList && ignoredUpdateVersions.includes(updateCheckResponse.latestVersion!)) {
        console.debug(`Update ignored (version ${updateCheckResponse.latestVersion})`);
        return false;
    }

    // Show alert that a new update is available
    presentAlert({
        header: `Version ${updateCheckResponse.latestVersion} Available`,
        message: "Do you want to read the release notes?",
        buttons: [
            {
                text: "Ignore Update",
                role: "cancel",
                handler: () => {
                    const newIgnored = ignoredUpdateVersions;
                    if (!newIgnored.includes(updateCheckResponse.latestVersion!)) {
                        newIgnored.push(updateCheckResponse.latestVersion!);
                    }
                    Preferences.set({
                        ignoredUpdateVersions: newIgnored,
                    });
                },
            },
            {
                text: "No",
                role: "cancel",
            },
            {
                text: "Yes",
                role: "confirm",
                handler: () => {
                    window.open(`${EXCALIBUR_CHANGELOG_URL}/v${updateCheckResponse.latestVersion}`, "_blank");
                },
            },
        ],
    });
    return true;
}
