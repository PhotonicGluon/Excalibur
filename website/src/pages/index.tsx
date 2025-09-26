import { motion } from "motion/react";

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
        description: "Everything has a publicly traceable provenance.",
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
        title: "Military-Grade Security",
        description: "State-of-the-art encryption algorithms protect your files at rest and in transit.",
        icon: "🛡️",
        screenshot: <div className="text-gray-500">Screenshot Placeholder 1</div>,
    },
    {
        title: "Zero-Trust By Default",
        description: "Designed with zero-trust principles in mind. Trust no one but yourself.",
        icon: "🕵️",
        screenshot: <div className="text-gray-500">Screenshot Placeholder 2</div>,
    },
    {
        title: "User-Friendly",
        description: "Simple, intuitive interface that makes secure file storage effortless.",
        icon: "✨",
        screenshot: <div className="text-gray-500">Screenshot Placeholder 3</div>,
    },
];

// Main component
const Home: React.FC = () => {
    // States
    const { siteConfig } = useDocusaurusContext();

    // Render
    const featureRows = [];
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
                            className="mb-6 !text-5xl font-bold text-gray-800 md:!text-7xl dark:text-white"
                            variants={fadeInUp}
                        >
                            {siteConfig.title}
                        </motion.h1>
                        <motion.p
                            className="mb-10 !text-center !text-xl text-gray-700 md:!text-2xl dark:text-gray-200"
                            variants={fadeInUp}
                        >
                            A trustless secure file management solution using military-grade encryption.
                        </motion.p>
                        <motion.div className="flex flex-col justify-center gap-4 sm:flex-row" variants={fadeInUp}>
                            <div className="group relative">
                                <button className="flex items-center rounded-lg bg-blue-600 px-6 py-3 text-lg font-bold text-white hover:bg-blue-700">
                                    Download
                                </button>
                                <div className="ring-opacity-5 invisible absolute left-0 z-50 mt-2 w-72 rounded-md bg-white opacity-0 shadow-lg ring-1 ring-black transition-all duration-150 group-hover:visible group-hover:opacity-100 dark:bg-gray-800">
                                    <div
                                        className="py-1 *:text-base *:!text-gray-700 *:!no-underline *:dark:!text-gray-400"
                                        role="menu"
                                        aria-orientation="vertical"
                                    >
                                        <a
                                            id="download-app-android"
                                            href="/download?type=app-android"
                                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                            role="menuitem"
                                            target="_blank"
                                        >
                                            <svg
                                                className="mr-3 size-6 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span>Download App (Android)</span>
                                        </a>
                                        <a
                                            id="download-app-pwa"
                                            href="/download?type=app-pwa"
                                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                            role="menuitem"
                                            target="_blank"
                                        >
                                            <svg
                                                className="mr-3 size-6 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                                />
                                            </svg>
                                            <span>Download App (PWA)</span>
                                        </a>
                                        <hr className="!my-1" />
                                        <a
                                            id="download-server"
                                            href="/download?type=server"
                                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                            role="menuitem"
                                            target="_blank"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.5"
                                                stroke="currentColor"
                                                className="mr-3 size-6 text-gray-400"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
                                                />
                                            </svg>

                                            <span>Download Server</span>
                                        </a>
                                        <a
                                            id="download-server-pwa"
                                            href="/download?type=server-pwa"
                                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                            role="menuitem"
                                            target="_blank"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.5"
                                                stroke="currentColor"
                                                className="mr-3 size-6 text-gray-400"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
                                                />
                                            </svg>

                                            <span>Download Server (with PWA)</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <GoToDocsButton text="Documentation" />
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            <main className="bg-gray-100 dark:bg-gray-900">
                {/* Signature features */}
                <section className="py-24">
                    <div className="container mx-auto space-y-24 px-4">
                        {signatureFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="grid items-center gap-12 md:grid-cols-2"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                variants={staggerContainer}
                            >
                                <motion.div
                                    className={`flex h-80 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-lg/25 dark:border-gray-700 dark:bg-gray-800 ${
                                        index % 2 === 0 ? "md:order-1" : "md:order-2"
                                    }`}
                                    variants={fadeInUp}
                                >
                                    {feature.screenshot}
                                </motion.div>
                                <motion.div
                                    className={`text-left ${index % 2 === 0 ? "md:order-2" : "md:order-1"}`}
                                    variants={fadeInUp}
                                >
                                    <div className="mb-4 text-5xl">{feature.icon}</div>
                                    <h3 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="text-lg text-gray-600 dark:text-gray-400">{feature.description}</p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* "Other" features */}
                <section id="features" className="bg-white py-24 dark:bg-black/20">
                    <div className="container mx-auto px-4">
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
                            <p className="!text-center text-xl text-gray-600 dark:text-gray-400">
                                Everything you need to securely manage and share your files
                            </p>
                        </motion.div>

                        <div className="space-y-8">
                            {featureRows.map((row, rowIndex) => (
                                <motion.div
                                    key={rowIndex}
                                    className={`grid grid-cols-${itemsPerRow} gap-8`}
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
