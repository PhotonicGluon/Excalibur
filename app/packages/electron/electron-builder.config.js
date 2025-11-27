import packageInfo from "../../package.json" with { type: "json" };

/**
 * @type {import('electron-builder').Configuration}
 */
export default {
    extends: "electron-builder.yml",
    extraMetadata: {
        version: packageInfo.version,
        description: packageInfo.description,
        author: packageInfo.author,
        homepage: packageInfo.homepage,
    },
};
