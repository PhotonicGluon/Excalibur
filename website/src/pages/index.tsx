import { useEffect, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import { Variants } from "motion";
import { motion } from "motion/react";

// Types
interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
}

interface SignatureFeatureProps extends FeatureCardProps {
    color: string;
}

// Animation variants with proper typing
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1], // cubic-bezier equivalent of easeOutQuad
        },
    },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
        },
    },
};

// Custom hook for viewport animations
function useIsInView(ref: React.RefObject<HTMLElement>): boolean {
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ref]);

    return isInView;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useIsInView(ref);

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="p-6 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary-500"
        >
            <div className="text-4xl mb-4 text-primary-500">{icon}</div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-300">{description}</p>
        </motion.div>
    );
};

const Home: React.FC = () => {
    const { siteConfig } = useDocusaurusContext();
    const heroRef = useRef<HTMLDivElement>(null);
    const isHeroInView = useIsInView(heroRef);

    const signatureFeatures: SignatureFeatureProps[] = [
        {
            title: "Military-Grade Security",
            description: "State-of-the-art encryption algorithms protect your files at rest and in transit.",
            icon: "🛡️",
            color: "from-purple-600 to-blue-500",
        },
        {
            title: "Lightning Fast",
            description: "Optimized for speed with minimal overhead, even with large files.",
            icon: "⚡",
            color: "from-yellow-500 to-orange-500",
        },
        {
            title: "User-Friendly",
            description: "Simple, intuitive interface that makes secure file sharing effortless.",
            icon: "✨",
            color: "from-pink-500 to-rose-500",
        },
    ];

    const features: FeatureCardProps[] = [
        {
            title: "End-to-End Encryption",
            description:
                "Your files are encrypted before they leave your device, ensuring only you and your intended recipients can access them.",
            icon: "🔒",
        },
        {
            title: "Secure Sharing",
            description: "Share files with confidence using expiring links and password protection features.",
            icon: "🔗",
        },
        {
            title: "Zero-Knowledge Architecture",
            description: "We never store your encryption keys, ensuring complete privacy and security.",
            icon: "🛡️",
        },
        {
            title: "Cross-Platform",
            description: "Access your files from any device with a modern web browser.",
            icon: "🌐",
        },
        {
            title: "Open Source",
            description: "Fully transparent and auditable codebase for maximum trust and security.",
            icon: "📦",
        },
        {
            title: "Self-Hostable",
            description: "Deploy your own instance for complete control over your data.",
            icon: "🖥️",
        },
    ];

    return (
        <Layout
            title={`${siteConfig?.title || "Excalibur"} - ${siteConfig?.tagline || "Secure File Storage"}`}
            description={siteConfig?.tagline || "Secure file storage and sharing with end-to-end encryption"}
        >
            {/* Hero Section */}
            <header
                ref={heroRef}
                className="relative overflow-hidden min-h-[90vh] flex items-center bg-gradient-to-br from-gray-900 to-gray-800"
            >
                <div className="container relative z-10 text-center px-4">
                    <motion.div
                        className="max-w-4xl mx-auto text-center"
                        initial="hidden"
                        animate={isHeroInView ? "visible" : "hidden"}
                        variants={staggerContainer}
                    >
                        <motion.div
                            className="inline-block mb-6 px-4 py-2 rounded-full bg-primary-900/30 border border-primary-500/30 text-primary-300 text-sm font-medium"
                            variants={fadeInUp}
                        >
                            Secure File Storage & Sharing
                        </motion.div>

                        <motion.h1
                            className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-blue-400"
                            variants={fadeInUp}
                        >
                            {siteConfig.title}
                        </motion.h1>

                        <motion.p
                            className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto"
                            variants={fadeInUp}
                        >
                            The most secure way to store and share your files with end-to-end encryption.
                        </motion.p>

                        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={fadeInUp}>
                            <Link
                                className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary-500/30"
                                to="/docs"
                            >
                                Get Started
                            </Link>
                            <Link
                                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg text-lg transition-all duration-300 border border-gray-700 hover:border-gray-600"
                                to="#features"
                            >
                                Learn More
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            {/* Signature Features */}
            <section className="py-20 bg-gray-900/50 relative">
                <div className="absolute inset-0 bg-grid-white/[0.03] [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
                <div className="container px-4 mx-auto relative">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Why Choose Excalibur?</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Experience the next generation of secure file storage with our powerful features
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {signatureFeatures.map((feature, index) => (
                            <motion.div
                                key={index}
                                className={`p-8 rounded-2xl bg-gradient-to-br ${feature.color} text-white`}
                                variants={fadeInUp}
                                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                            >
                                <div className="text-5xl mb-4">{feature.icon}</div>
                                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-100">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 bg-gray-900">
                <div className="container px-4 mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Powerful Features</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Everything you need to securely manage and share your files
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        {features.map((feature, index) => (
                            <FeatureCard key={index} {...feature} />
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary-900/30 to-blue-900/30">
                <div className="container px-4 mx-auto text-center">
                    <motion.div
                        className="max-w-3xl mx-auto"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to get started?</h2>
                        <p className="text-xl text-gray-300 mb-10">
                            Join thousands of users who trust Excalibur with their files.
                        </p>
                        <Link
                            className="inline-block px-8 py-4 bg-white text-gray-900 font-medium rounded-lg text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
                            to="/docs"
                        >
                            Get Started for Free
                        </Link>
                    </motion.div>
                </div>
            </section>
        </Layout>
    );
};

export default Home;
