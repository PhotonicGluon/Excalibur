import { themes as prismThemes } from "prism-react-renderer";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

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

    // Production url of your site
    url: "https://excalibur.photonic.dev",

    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/",

    organizationName: "PhotonicGluon",
    projectName: "Excalibur",

    onBrokenLinks: "throw",

    // Even if you don't use internationalization, you can use this field to set useful metadata like html lang.
    // For example, if your site is Chinese, you may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    markdown: {
        hooks: {
            onBrokenMarkdownImages: "warn",
            onBrokenMarkdownLinks: "warn",
        },
        mermaid: true,
    },

    themes: ["@docusaurus/theme-mermaid"],

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    editUrl: "https://github.com/PhotonicGluon/Excalibur/tree/website/website",
                    remarkPlugins: [remarkMath],
                    rehypePlugins: [rehypeKatex],
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
        {
            href: "https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css",
            type: "text/css",
            integrity: "sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM",
            crossorigin: "anonymous",
        },
    ],

    plugins: [
        "./src/plugins/tailwind-config.js",
        [
            "@docusaurus/plugin-ideal-image",
            {
                quality: 85,
                max: 1080,
                min: 480,
                steps: 4,
            },
        ],
        [
            // Changelog 'blog'
            "@docusaurus/plugin-content-blog",
            {
                id: "changelog",
                routeBasePath: "changelog",
                path: "./changelog",
                blogTitle: "Excalibur Changelog",
                blogDescription: "A history of changes and version updates for Excalibur.",
                blogSidebarTitle: "Changelog",
                blogSidebarCount: "ALL",
                postsPerPage: 5,
                showReadingTime: true,
                readingTime: ({ content }) => content.length,
                onUntruncatedBlogPosts: "ignore",
            },
        ],
    ],

    themeConfig: {
        // Project's social card
        image: "img/banner.png",

        // announcementBar: {
        //     id: "welcome",
        //     content:
        //         '⭐️ If you like Excalibur, give it a star on <a href="https://github.com/PhotonicGluon/Excalibur">GitHub</a>!',
        //     backgroundColor: "#2c3e50",
        //     textColor: "#ffffff",
        //     isCloseable: true,
        // },

        colorMode: {
            defaultMode: "dark",
        },

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
                    docId: "guide/welcome",
                    label: "Guide",
                },
                {
                    type: "docSidebar",
                    position: "left",
                    sidebarId: "reference",
                    label: "Reference",
                },
                { position: "left", to: "/changelog", label: "Changelog" },
                {
                    href: "https://github.com/PhotonicGluon/Excalibur",
                    label: "GitHub",
                    position: "right",
                },
                {
                    type: "html",
                    position: "right",
                    value: `
                        <a
                            href="/downloads"
                            class="block w-fit rounded-lg bg-blue-600 px-4 py-2 text-center text-white no-underline hover:bg-blue-700"
                        >
                            Download
                        </a>
                    `,
                },
            ],
        },
        prism: {
            additionalLanguages: ["bash", "diff"],
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
    customFields: {
        latestVersion: "0.4.4",
    },
};

export default config;
