import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "Excalibur",
    tagline: "Secure File Storage and Sharing",
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

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "PhotonicGluon",
    projectName: "Excalibur",

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
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

    scripts: [
        {
            src: "https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js",
            async: true,
        },
    ],

    plugins: ["./src/plugins/tailwind-config.js"],

    themeConfig: {
        colorMode: {
            defaultMode: "dark",
        },

        // Add announcement bar if needed
        // announcementBar: {
        //     id: "welcome",
        //     content:
        //         '⭐️ If you like Excalibur, give it a star on <a href="https://github.com/your-org/Excalibur">GitHub</a>!',
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
                // {
                //     type: "docSidebar",
                //     sidebarId: "tutorialSidebar",
                //     position: "left",
                //     label: "Tutorial",
                // },
                {
                    href: "https://github.com/PhotonicGluon/Excalibur",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            copyright: `Copyright © ${new Date().getFullYear()}. Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
