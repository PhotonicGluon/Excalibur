import { useEffect, useRef } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import { useColorMode } from "@docusaurus/theme-common";
import { Variants, motion } from "motion/react";

// Types
interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
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

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
    return (
        <motion.div
            variants={fadeInUp}
            className="p-6 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-shadow duration-300"
        >
            <div className="text-4xl mb-4 text-primary-500">{icon}</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </motion.div>
    );
};

// High-performance particle wave using HTML Canvas
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

            const particleColor = colorMode === "dark" ? "rgba(96, 165, 250, 1)" : "rgba(0,0,0, 1)";
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

const GetStartedButton: React.FC = () => {
    return (
        <Link
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 !text-white !no-underline font-bold rounded-lg text-lg transition-transform duration-300 transform-all shadow-lg"
            to="/docs"
        >
            Get Started
        </Link>
    );
};

const Home: React.FC = () => {
    const { siteConfig } = useDocusaurusContext();

    const signatureFeatures: FeatureCardProps[] = [
        {
            title: "Military-Grade Security",
            description: "State-of-the-art encryption algorithms protect your files at rest and in transit.",
            icon: "🛡️",
        },
        {
            title: "Lightning Fast",
            description: "Optimized for speed with minimal overhead, even with large files.",
            icon: "⚡",
        },
        {
            title: "User-Friendly",
            description: "Simple, intuitive interface that makes secure file sharing effortless.",
            icon: "✨",
        },
    ];

    const features: FeatureCardProps[] = [
        {
            title: "End-to-End Encryption",
            description: "Your files are encrypted before they leave your device.",
            icon: "🔒",
        },
        {
            title: "Secure Sharing",
            description: "Share files with expiring links and password protection.",
            icon: "🔗",
        },
        { title: "Zero-Knowledge", description: "We never store your keys, ensuring complete privacy.", icon: "🛡️" },
        {
            title: "Cross-Platform",
            description: "Access your files from any device with a modern browser.",
            icon: "🌐",
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
    const itemsPerRow = 3;
    for (let i = 0; i < features.length; i += itemsPerRow) {
        featureRows.push(features.slice(i, i + itemsPerRow));
    }

    return (
        <Layout title={`${siteConfig?.title}`} description={siteConfig?.tagline}>
            <header className="relative overflow-hidden min-h-screen flex items-center justify-center">
                <CanvasWaveBackground />
                <div className="absolute inset-0 bg-white/70 dark:bg-black/60" /> {/* Overlay for text readability */}
                <div className="container relative z-10 text-center px-4">
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                        <motion.h1
                            className="!text-5xl md:!text-7xl font-bold mb-6 text-gray-800 dark:text-white"
                            variants={fadeInUp}
                        >
                            {siteConfig.title}
                        </motion.h1>
                        <motion.p
                            className="!text-xl md:!text-2xl text-gray-700 dark:text-gray-200 mb-10"
                            variants={fadeInUp}
                        >
                            The most secure way to store and share your files with end-to-end encryption.
                        </motion.p>
                        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={fadeInUp}>
                            <GetStartedButton />
                            <Link
                                className="px-8 py-4 bg-transparent border-2 border-gray-800 dark:border-white text-gray-800 dark:text-white hover:text-gray-800 dark:hover:text-white !no-underline font-bold rounded-lg text-lg transition-all duration-300 hover:bg-gray-800/10 dark:hover:bg-white/10"
                                to="#features"
                            >
                                Learn More
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            <main className="bg-gray-100 dark:bg-gray-900">
                <section className="py-24">
                    <div className="container px-4 mx-auto space-y-24">
                        {signatureFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="grid md:grid-cols-2 gap-12 items-center"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                variants={staggerContainer}
                            >
                                <motion.div
                                    className={`rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-80 flex items-center justify-center shadow-lg ${
                                        index % 2 === 0 ? "md:order-1" : "md:order-2"
                                    }`}
                                    variants={fadeInUp}
                                >
                                    <div className="text-gray-500">Screenshot Placeholder</div>
                                </motion.div>
                                <motion.div
                                    className={`text-left ${index % 2 === 0 ? "md:order-2" : "md:order-1"}`}
                                    variants={fadeInUp}
                                >
                                    <div className="text-5xl mb-4">{feature.icon}</div>
                                    <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="text-lg text-gray-600 dark:text-gray-400">{feature.description}</p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section id="features" className="py-24 bg-white dark:bg-black/20">
                    <div className="container px-4 mx-auto">
                        <motion.div
                            className="text-center mb-16"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={fadeInUp}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
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
                                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
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

                <section className="py-24">
                    <div className="container px-4 mx-auto text-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={fadeInUp}
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
                                Ready to get started?
                            </h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300 pb-4 mb-10">
                                Join thousands of users who trust Excalibur with their files.
                            </p>
                            <GetStartedButton />
                        </motion.div>
                    </div>
                </section>
            </main>
        </Layout>
    );
};

export default Home;
