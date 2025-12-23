import { Apple, Code, Globe, Laptop, Monitor, Server, Smartphone, Terminal } from "lucide-react";
import React from "react";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";

import DownloadCard, { DownloadLink } from "@site/src/components/DownloadCard";

const DownloadPage: React.FC = () => {
    // States
    const { siteConfig } = useDocusaurusContext();

    const appDownloads: DownloadLink[] = [
        {
            platform: "Windows",
            label: "Installer (.exe)",
            href: "#",
            icon: <Laptop className="size-5" />,
        },
        {
            platform: "macOS",
            label: "Universal Disk Image (.dmg)",
            href: "#",
            icon: <Apple className="size-5" />,
        },
        {
            platform: "Linux",
            label: "AppImage / .deb",
            href: "#",
            icon: <Terminal className="size-5" />,
        },
        {
            platform: "Android",
            label: "APK Package",
            href: "#",
            icon: <Smartphone className="size-5" />,
        },
        {
            platform: "PWA",
            label: "Web Assets (.zip)",
            href: "#",
            icon: <Globe className="size-5" />,
        },
    ];

    const serverDownloads: DownloadLink[] = [
        {
            platform: "Server",
            label: "Wheel (.whl)",
            href: "#",
            icon: <Server className="size-5" />,
        },
        {
            platform: "Server",
            label: "Source (.tar.gz)",
            href: "#",
            icon: <Code className="size-5" />,
        },
    ];

    return (
        <Layout title={`${siteConfig?.title}`} description={siteConfig?.tagline}>
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
