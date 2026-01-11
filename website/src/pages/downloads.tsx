import { Apple, Globe, Laptop, Monitor, Server, Smartphone, Terminal } from "lucide-react";
import React, { useEffect } from "react";

import Layout from "@theme/Layout";

import DownloadCard, { DownloadInfo } from "@site/src/components/DownloadCard";

const DownloadPage: React.FC = () => {
    const appDownloads: DownloadInfo[] = [
        {
            platform: "Windows",
            icon: <Laptop className="size-5" />,
            links: [{ label: "Installer (.exe)", assetID: "app-win-installer" }],
        },
        {
            platform: "macOS",
            icon: <Apple className="size-5" />,
            links: [
                { label: "Universal Disk Image (.dmg)", assetID: "app-mac-dmg" },
                { label: "Zipped Application (.zip)", assetID: "app-mac-app" },
            ],
        },
        {
            platform: "Ubuntu",
            icon: <Terminal className="size-5" />,
            links: [
                { label: "Debian Package (.deb)", assetID: "app-linux-deb" },
                { label: "AppImage (.AppImage)", assetID: "app-linux-appimage" },
            ],
        },
        {
            platform: "Android",
            icon: <Smartphone className="size-5" />,
            links: [{ label: "Android Package Kit (.apk)", assetID: "app-android-apk" }],
        },
        {
            platform: "Progressive Web App (PWA)",
            icon: <Globe className="size-5" />,
            links: [{ label: "Web Assets (.zip)", assetID: "app-pwa" }],
        },
    ];

    const serverDownloads: DownloadInfo[] = [
        {
            platform: "Python Package",
            icon: <Server className="size-5" />,
            links: [
                { label: "Wheel (.whl)", assetID: "server-whl" },
                { label: "Source (.tar.gz)", assetID: "server-src" },
            ],
        },
    ];

    // Effects
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const version = params.get("version");
        if (!version) {
            return;
        }

        if (version < "0.3.0") {
            // Redirect to main download page
            window.location.href = "/downloads";
            return;
        }

        // Append the version to each download link
        document.querySelectorAll(".download-link").forEach((link) => {
            const href = link.getAttribute("href");
            if (href) {
                link.setAttribute("href", href + "&version=" + version);
            }
        });
    }, []);

    // Render
    return (
        <Layout title="Downloads" description="Download Excalibur for your preferred platform">
            <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900 dark:bg-slate-900">
                {/* Hero Section */}
                <header className="relative mb-12 border-b border-slate-200 bg-white pt-16 pb-12 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mx-auto max-w-5xl px-6">
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
                            Downloads
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                            Get the latest version of Excalibur for your preferred platform.
                        </p>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl space-y-16 px-6">
                    {/* Application Section */}
                    <section>
                        <div className="mb-8 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950">
                                <Monitor className="block size-6" />
                            </div>
                            <div className="*:mb-0">
                                <h2 className="text-2xl font-semibold dark:text-slate-100">Application</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Available on Desktop, Mobile, and Web
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {appDownloads.map((item) => (
                                <DownloadCard key={item.platform} item={item} />
                            ))}
                        </div>
                    </section>

                    {/* Server Section */}
                    <section>
                        <div className="mb-8 flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-950">
                                <Server className="block size-6" />
                            </div>
                            <div className="*:mb-0">
                                <h2 className="text-2xl font-semibold dark:text-slate-100">Server</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Self-host your own instance
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {serverDownloads.map((item) => (
                                <DownloadCard key={item.platform} item={item} />
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </Layout>
    );
};

export default DownloadPage;
