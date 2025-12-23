import { motion } from "motion/react";
import { isAndroid, isMacOs, isWindows } from "react-device-detect";

import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";

import FeatureCard, { FeatureCardProps } from "@site/src/components/FeatureCard";
import GoToDocsButton from "@site/src/components/GoToDocsButton";
import WaveBackground from "@site/src/components/WaveBackground";
import { fadeInUp, staggerContainer } from "@site/src/variants";

// Features
export const features: FeatureCardProps[] = [
    {
        title: "End-to-End Encryption",
        description: "Data in transit are always encrypted using AES-GCM.",
        icon: "🔒",
    },
    {
        title: "Zero-Knowledge Authentication",
        description: "Your password never leaves your device.",
        icon: "🗝️",
    },
    {
        title: "Multi-Platform",
        description: "Available as an Android app and a Progressive Web App (PWA).",
        icon: "📱",
    },
    {
        title: "Open Source",
        description: "Fully transparent and auditable codebase for maximum trust.",
        icon: "📦",
    },
    {
        title: "Attestations",
        description: "Everything has a publicly traceable provenance for maximum transparency.",
        icon: "🗺️",
    },
    {
        title: "Self-Hostable",
        description: "Deploy your own instance for complete control over your data.",
        icon: "🖥️",
    },
];

interface SignatureFeatureProps extends FeatureCardProps {
    screenshot: React.ReactNode;
}
export const signatureFeatures: SignatureFeatureProps[] = [
    {
        title: "User-Friendly",
        description: "Simple, intuitive interface that makes secure file storage effortless.",
        icon: "✨",
        screenshot: <img src="/img/screenshots/explorer.png" alt="Explorer" />,
    },
    {
        title: "Military-Grade Security",
        description: "State-of-the-art encryption algorithms protect your files at rest and in transit.",
        icon: "🛡️",
        screenshot: <img src="/img/screenshots/security.png" alt="Security" />,
    },
    {
        title: "Zero-Trust By Default",
        description: "Designed with zero-trust principles in mind. Trust no one but yourself.",
        icon: "🕵️",
        screenshot: <img src="/img/screenshots/zero-trust.png" alt="Excalibur Authentication Process" />,
    },
];

// Main component
const Home: React.FC = () => {
    // States
    const { siteConfig } = useDocusaurusContext();

    // Decide link for download
    let downloadAsset: { href: string; text: string; newTab?: boolean } = {
        href: "/downloads",
        text: "Download",
    };
    if (isWindows) {
        downloadAsset = {
            href: "/download?id=app-win-installer",
            text: "Download for Windows",
            newTab: true,
        };
    }
    if (isMacOs) {
        downloadAsset = {
            href: "/download?id=app-mac-dmg",
            text: "Download for macOS",
            newTab: true,
        };
    }
    if (isAndroid) {
        downloadAsset = {
            href: "/download?id=app-android-apk",
            text: "Download for Android",
            newTab: true,
        };
    }

    // Render
    const featureRows: FeatureCardProps[][] = [];
    const itemsPerRow = 3;
    for (let i = 0; i < features.length; i += itemsPerRow) {
        featureRows.push(features.slice(i, i + itemsPerRow));
    }

    return (
        <Layout title={`${siteConfig?.title}`} description={siteConfig?.tagline}>
            {/* Hero box */}
            <header className="relative flex min-h-[calc(100vh-var(--spacing)*16)] items-center justify-center overflow-hidden">
                <WaveBackground />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60" />
                <div className="relative z-10 container px-4 text-center">
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                        <motion.h1
                            className="mb-6 text-5xl! font-bold text-gray-800 md:text-7xl! dark:text-white"
                            variants={fadeInUp}
                        >
                            {siteConfig.title}
                        </motion.h1>
                        <motion.p
                            className="mb-10 text-center! text-xl! text-gray-700 md:text-2xl! dark:text-gray-200"
                            variants={fadeInUp}
                        >
                            A trustless secure file management solution using military-grade encryption.
                        </motion.p>
                        <motion.div className="flex flex-col justify-center gap-4 sm:flex-row" variants={fadeInUp}>
                            <div className="group relative">
                                <Link
                                    to={downloadAsset.href}
                                    className="block w-full rounded-lg bg-blue-600 px-8 py-4 text-center text-lg font-bold text-white! no-underline! hover:bg-blue-700 md:w-fit"
                                    target={downloadAsset.newTab ? "_blank" : undefined}
                                >
                                    {downloadAsset.text}
                                </Link>
                            </div>

                            {/* Documentation button */}
                            <GoToDocsButton text="Documentation" />
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            <main className="bg-slate-100 dark:bg-slate-900">
                {/* Signature features */}
                <section className="py-24">
                    <div className="container mx-auto space-y-24 px-4">
                        {signatureFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="grid items-center gap-12 lg:grid-cols-2"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                variants={staggerContainer}
                            >
                                <motion.div
                                    className={`flex items-center justify-center rounded-lg border-gray-200 lg:h-80 lg:border lg:bg-white lg:shadow-lg/25 dark:border-gray-700 lg:dark:bg-slate-800 ${
                                        index % 2 === 0 ? "lg:order-1" : "lg:order-2"
                                    } *:max-h-full`}
                                    variants={fadeInUp}
                                >
                                    {feature.screenshot}
                                </motion.div>
                                <motion.div
                                    className={`text-left ${index % 2 === 0 ? "lg:order-2" : "lg:order-1"}`}
                                    variants={fadeInUp}
                                >
                                    <div className="flex items-center gap-y-4 lg:block lg:gap-0">
                                        <div className="text-4xl md:text-5xl lg:mb-4">{feature.icon}</div>
                                        <h3 className="mb-0! text-3xl font-bold text-gray-900 dark:text-white">
                                            {feature.title}
                                        </h3>
                                    </div>

                                    <p className="my-4! text-lg text-gray-600 dark:text-gray-400">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* "Other" features */}
                <section id="features" className="bg-white py-24 dark:bg-black/20">
                    <div className="container mx-auto px-4">
                        {/* Title */}
                        <motion.div
                            className="mb-16 text-center"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={fadeInUp}
                        >
                            <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                                Powerful Features
                            </h2>
                            <p className="text-center! text-xl text-gray-600 dark:text-gray-400">
                                Everything you need to securely manage and share your files
                            </p>
                        </motion.div>

                        {/* For mobile */}
                        <div className="lg:hidden">
                            <motion.div
                                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                                variants={staggerContainer}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                            >
                                {featureRows.map((row, _rowIndex) =>
                                    row.map((feature, cardIndex) => <FeatureCard key={cardIndex} {...feature} />),
                                )}
                            </motion.div>
                        </div>

                        {/* For desktop */}
                        <div className="hidden space-y-8 lg:block">
                            {featureRows.map((row, rowIndex) => (
                                <motion.div
                                    key={rowIndex}
                                    className="grid grid-cols-3 gap-x-8"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                >
                                    {row.map((feature, cardIndex) => (
                                        <FeatureCard key={cardIndex} {...feature} />
                                    ))}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Call to action */}
                <section className="py-24">
                    <div className="container mx-auto px-4 text-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={fadeInUp}
                        >
                            <h2 className="mb-10 pb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                                Secure your data today.
                            </h2>
                            <GoToDocsButton text="Get Started" />
                        </motion.div>
                    </div>
                </section>
            </main>
        </Layout>
    );
};

export default Home;
