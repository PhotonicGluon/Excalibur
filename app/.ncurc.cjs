/** @type {import("npm-check-updates").RcOptions } */
module.exports = {
    upgrade: true,
    filterResults: (packageName, { currentVersionSemver, upgradedVersionSemver }) => {
        // Get version majors
        const currentMajor = parseInt(currentVersionSemver[0]?.major, 10);
        const upgradedMajor = parseInt(upgradedVersionSemver?.major, 10);

        if (!currentMajor || !upgradedMajor) {
            return true;
        }

        // Prohibit Vite v8 updates
        // (We're working on updates on a separate branch)
        if (packageName == "vite" && upgradedMajor >= 8) {
            return false;
        }

        return true;
    },
};
