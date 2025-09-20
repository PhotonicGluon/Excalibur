import { themes as prismThemes } from "prism-react-renderer";

import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

const config: Config = {
    title: "Excalibur",
    tagline: "A trustless secure file management solution using military-grade encryption",
    favicon: "img/favicon.ico",

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "http://your-docusaurus-site.example.com", // TODO: Change
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/",

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    // Even if you don't use internationalization, you can use this field to set useful metadata like html lang.
    // For example, if your site is Chinese, you may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    markdown: {
        mermaid: true,
    },

    themes: ["@docusaurus/theme-mermaid"],

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    editUrl: "https://github.com/PhotonicGluon/Excalibur/tree/main/website",
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    stylesheets: [
        {
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
            type: "text/css",
        },
    ],

    plugins: ["./src/plugins/tailwind-config.js"],

    themeConfig: {
        colorMode: {
            defaultMode: "dark",
        },

        // announcementBar: {
        //     id: "welcome",
        //     content:
        //         '⭐️ If you like Excalibur, give it a star on <a href="https://github.com/PhotonicGluon/Excalibur">GitHub</a>!',
        //     backgroundColor: "#2c3e50",
        //     textColor: "#ffffff",
        //     isCloseable: true,
        // },

        // Replace with your project's social card
        image: "img/docusaurus-social-card.jpg",
        navbar: {
            title: "Excalibur",
            logo: {
                alt: "Excalibur Logo",
                src: "img/logo.svg",
            },
            items: [
                {
                    type: "doc",
                    position: "left",
                    docId: "docs/welcome",
                    label: "Docs",
                },
                {
                    type: "docSidebar",
                    position: "left",
                    sidebarId: "dev",
                    label: "Development",
                },
                {
                    href: "https://github.com/PhotonicGluon/Excalibur",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        prism: {
            additionalLanguages: ["bash"],
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
