import { parseSemVer } from "semver-parser";

/**
 * Checks if the given semver is a prerelease (e.g., alpha, beta, release candidate).
 *
 * @param semver The semver to check
 * @returns Whether the semver is a prerelease
 */
export function isPrerelease(semver: string): boolean {
    const semverVersion = parseSemVer(semver);
    if (!semverVersion) {
        return false;
    }
    return Boolean(semverVersion.pre?.length);
}
