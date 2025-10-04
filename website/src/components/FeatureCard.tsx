import { motion } from "motion/react";

import { fadeInUp } from "@site/src/variants";

export interface FeatureCardProps {
    title: string;
    description: string;
    icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
    return (
        <motion.div
            variants={fadeInUp}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg transition-shadow duration-300 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800/50"
        >
            <div className="flex items-center gap-y-4 lg:block lg:gap-0">
                <div className="text-primary-500 mb-4 text-4xl">{icon}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </motion.div>
    );
};

export default FeatureCard;
