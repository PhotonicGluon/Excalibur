import { useEffect, useState } from "react";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";

import WaveBackground from "@site/src/components/WaveBackground";

const DOWNLOAD_TYPES = ["app-android", "app-pwa", "server", "server-pwa"];

// Main component
const Download: React.FC = () => {
    // States
    const { siteConfig } = useDocusaurusContext();

    const [downloadURL, setDownloadURL] = useState<string>("");
    const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);

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

    // Effects
    useEffect(() => {
        // Get download type
        const params = new URLSearchParams(window.location.search);
        const type = params.get("type");
        if (!DOWNLOAD_TYPES.includes(type)) {
            window.location.href = "/";
        }

        // Update download info
        let downloadTypeHuman: string;
        switch (type) {
            case "app-android":
                downloadTypeHuman = "Android App";
                break;
            case "app-pwa":
                downloadTypeHuman = "PWA App";
                break;
            case "server":
                downloadTypeHuman = "Server";
                break;
            case "server-pwa":
                downloadTypeHuman = "PWA Server";
                break;
        }
        document.getElementById("human-download-type")!.textContent = " " + downloadTypeHuman;

        // Generate download URL components
        const organizationName = siteConfig.organizationName;
        const projectName = siteConfig.projectName;
        const latestVersion = siteConfig.customFields.latestVersion;

        let downloadURLBase = `https://github.com/${organizationName}/${projectName}/releases/download/v${latestVersion}/`;
        let downloadFile: string;
        switch (type) {
            case "app-pwa":
                downloadFile = `app-v${latestVersion}-pwa.zip`;
                break;
            case "app-android":
                downloadFile = `app-v${latestVersion}-release.apk`;
                break;
            case "server":
                downloadFile = `excalibur_server-${latestVersion}-py3-none-any.whl`;
                break;
            case "server-pwa":
                downloadFile = `excalibur_server-${latestVersion}-py3-none-any_pwa.whl`;
                break;
        }

        setDownloadURL(downloadURLBase + downloadFile);
    });

    useEffect(() => {
        setTimeout(() => {
            if (downloadURL) {
                console.log(`Downloading ${downloadURL}...`);
                handleDownload(downloadURL);
                setDownloadTriggered(true);
            }
        }, 1000);
    }, [downloadURL]);

    // Render
    return (
        <Layout title={`${siteConfig?.title}`} description={siteConfig?.tagline}>
            <div className="flex min-h-[calc(100vh-var(--spacing)*16)] items-center justify-center">
                <WaveBackground />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60" />
                <div className="relative z-10 container px-4 text-center">
                    <h1 className="block text-4xl! font-bold text-gray-800 dark:text-white">
                        Downloading<span id="human-download-type" className="font-bold"></span>...
                    </h1>
                    <p className="text-center! text-lg">
                        Your download should start automatically.{" "}
                        {downloadTriggered && (
                            <span>
                                If it didn't start, try this{" "}
                                <a href={downloadURL} className="underline">
                                    direct download link
                                </a>
                                .
                            </span>
                        )}
                    </p>
                </div>
            </div>
        </Layout>
    );
};

export default Download;
