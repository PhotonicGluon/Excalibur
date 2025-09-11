import { Variants, motion } from "motion/react";
import { useEffect, useRef } from "react";

import Link from "@docusaurus/Link";
import { useColorMode } from "@docusaurus/theme-common";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import Layout from "@theme/Layout";

// Types
interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
}

interface SignatureFeatureProps extends FeatureCardProps {
    screenshot: React.ReactNode;
}

// Animation variants
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

// Helper components
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
    return (
        <motion.div
            variants={fadeInUp}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800/50"
        >
            <div className="text-primary-500 mb-4 text-4xl">{icon}</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </motion.div>
    );
};

const GetStartedButton: React.FC = () => {
    return (
        <Link
            className="transform-all rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 text-lg font-bold !text-white !no-underline shadow-lg transition-transform duration-300 hover:from-purple-600 hover:to-blue-600"
            to="/docs"
        >
            Get Started
        </Link>
    );
};

const CanvasWaveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { colorMode } = useColorMode();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        let animationFrameId: number;
        let time = 0;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const particleConfig = {
            rows: 25,
            cols: 50,
            spacing: 40,
            amplitude: 20,
            frequency: 0.08,
            speed: 0.02,
            baseRadius: 1.5,
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const gridWidth = particleConfig.cols * particleConfig.spacing;
            const gridHeight = particleConfig.rows * particleConfig.spacing;
            const startX = (canvas.width - gridWidth) / 2;
            const startY = (canvas.height - gridHeight) / 2;

            const particleColor = colorMode === "dark" ? "rgba(96, 165, 250, 1)" : "rgba(0, 0, 0, 1)";
            ctx.fillStyle = particleColor;

            for (let i = 0; i < particleConfig.rows; i++) {
                for (let j = 0; j < particleConfig.cols; j++) {
                    const x = startX + j * particleConfig.spacing;
                    const yOffset = Math.sin(j * particleConfig.frequency + time) * particleConfig.amplitude;
                    const y = startY + i * particleConfig.spacing + yOffset;

                    const opacityFactor = 0.5 + (Math.sin(j * particleConfig.frequency * 0.7 + time) + 1) / 4;
                    const radius = particleConfig.baseRadius * opacityFactor;

                    ctx.globalAlpha = opacityFactor;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;
        };

        const animate = () => {
            time += particleConfig.speed;
            draw();
            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate();

        window.addEventListener("resize", resizeCanvas);
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [colorMode]);

    return <canvas ref={canvasRef} className="absolute inset-0 -z-10 bg-gray-50 dark:bg-gray-900" />;
};

// Main component
const Home: React.FC = () => {
    const { siteConfig } = useDocusaurusContext();

    const signatureFeatures: SignatureFeatureProps[] = [
        {
            title: "Military-Grade Security",
            description: "State-of-the-art encryption algorithms protect your files at rest and in transit.",
            icon: "🛡️",
            screenshot: <div className="text-gray-500">Screenshot Placeholder 1</div>,
        },
        {
            title: "Zero-Trust By Default",
            description:
                "Designed with zero-trust principles in mind, so even the server doesn't know what you are storing.",
            icon: "🕵️",
            screenshot: <div className="text-gray-500">Screenshot Placeholder 2</div>,
        },
        {
            title: "User-Friendly",
            description: "Simple, intuitive interface that makes secure file sharing effortless.",
            icon: "✨",
            screenshot: <div className="text-gray-500">Screenshot Placeholder 3</div>,
        },
    ];

    const features: FeatureCardProps[] = [
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
            title: "Open Source",
            description: "Fully transparent and auditable codebase for maximum trust.",
            icon: "📦",
        },
        {
            title: "Self-Hostable",
            description: "Deploy your own instance for complete control over your data.",
            icon: "🖥️",
        },
    ];

    const featureRows = [];
    const itemsPerRow = 2;
    for (let i = 0; i < features.length; i += itemsPerRow) {
        featureRows.push(features.slice(i, i + itemsPerRow));
    }

    return (
        <Layout title={`${siteConfig?.title}`} description={siteConfig?.tagline}>
            {/* Hero box */}
            <header className="relative flex min-h-screen items-center justify-center overflow-hidden">
                <CanvasWaveBackground />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60" /> {/* Overlay for text readability */}
                <div className="relative z-10 container px-4 text-center">
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                        <motion.h1
                            className="mb-6 !text-5xl font-bold text-gray-800 md:!text-7xl dark:text-white"
                            variants={fadeInUp}
                        >
                            {siteConfig.title}
                        </motion.h1>
                        <motion.p
                            className="mb-10 !text-xl text-gray-700 md:!text-2xl dark:text-gray-200"
                            variants={fadeInUp}
                        >
                            The most secure way to store and share your files with end-to-end encryption.
                        </motion.p>
                        <motion.div className="flex flex-col justify-center gap-4 sm:flex-row" variants={fadeInUp}>
                            <GetStartedButton />
                            <Link
                                className="rounded-lg border-2 border-gray-800 bg-transparent px-8 py-4 text-lg font-bold text-gray-800 !no-underline transition-all duration-300 hover:bg-gray-800/10 hover:text-gray-800 dark:border-white dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                                to="#features"
                            >
                                Learn More
                            </Link>
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
                            <p className="text-xl text-gray-600 dark:text-gray-400">
                                Everything you need to securely manage and share your files
                            </p>
                        </motion.div>

                        <div className="space-y-8">
                            {featureRows.map((row, rowIndex) => (
                                <motion.div
                                    key={rowIndex}
                                    className="grid grid-cols-2 gap-8"
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
                            <GetStartedButton />
                        </motion.div>
                    </div>
                </section>
            </main>
        </Layout>
    );
};

export default Home;
