import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";

import WaveBackground from "@site/src/components/WaveBackground";

const ASSET_ID_TO_FILE: Record<string, string> = {
    // Windows
    "app-win-installer": "excalibur-electron-[VERSION]-setup.exe",
    // macOS
    "app-mac-dmg": "excalibur-electron-[VERSION].dmg",
    "app-mac-app": "Excalibur-[VERSION]-arm64-mac.zip",
    // Linux
    "app-linux-deb": "excalibur-electron_[VERSION]_amd64.deb",
    "app-linux-appimage": "excalibur-electron-[VERSION].AppImage",
    // Android
    "app-android-apk": "app-v[VERSION]-release.apk",
    // PWA
    "app-pwa": "app-v[VERSION]-pwa.zip",
    // Server
    "server-whl": "excalibur_server-[VERSION]-py3-none-any.whl",
    "server-src": "excalibur_server-[VERSION].tar.gz",
};

// Main component
const DownloadAsset: React.FC = () => {
    // Contexts
    const { siteConfig } = useDocusaurusContext();

    // Check requested version, if provided
    const params = new URLSearchParams(window.location.search);
    const requestedVersion = params.get("version");
    if (requestedVersion && requestedVersion < "0.3.0") {
        // Redirect to main download page
        window.location.href = "/downloads";
        return;
    }

    // Get asset download ID
    const assetID = params.get("id");
    if (!ASSET_ID_TO_FILE[assetID]) {
        window.location.href = "/";
    }

    // Generate download URL components
    const organizationName = siteConfig.organizationName;
    const projectName = siteConfig.projectName;
    const version = requestedVersion || (siteConfig.customFields.latestVersion as string);

    let downloadURLBase = `https://github.com/${organizationName}/${projectName}/releases/download/v${version}/`;
    let downloadFile = ASSET_ID_TO_FILE[assetID].replace("[VERSION]", version);

    const downloadURL = downloadURLBase + downloadFile;

    // Start download after 1 second
    setTimeout(() => {
        console.log(`Downloading ${downloadURL}...`);
        handleDownload(downloadURL);
    }, 1000);

    // Functions
    /**
     * Handles the download of a file.
     *
     * @param url The URL of the file to download
     */
    function handleDownload(url: string) {
        const a = document.createElement("a");
        a.href = url;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    // Render
    return (
        <Layout title="Thanks For Downloading Excalibur" description="Thank you for downloading Excalibur">
            <div className="flex min-h-[calc(100vh-var(--spacing)*16)] items-center justify-center">
                <WaveBackground />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60" />
                <div className="relative z-10 container px-4 text-center">
                    <h1 className="block text-4xl! font-bold text-gray-800 dark:text-white">
                        Thanks for downloading Excalibur {version}!
                    </h1>
                    <p className="text-center! text-lg">
                        Your download should start automatically. If it doesn't start soon, try this{" "}
                        <a href={downloadURL} className="underline">
                            direct download link
                        </a>
                        .
                    </p>
                </div>
            </div>
        </Layout>
    );
};

export default DownloadAsset;
