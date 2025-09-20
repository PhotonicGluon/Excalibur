// This file is a custom document component that wraps the entire app
// It's used to add custom HTML, CSS, and other global elements

import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Head from "@docusaurus/Head";

// Default implementation, that you can customize
export default function Root({ children }) {
    const { siteConfig } = useDocusaurusContext();

    return (
        <>
            <Head>
                {/* Preload Inter font for better performance */}
                <link
                    rel="preload"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    as="style"
                    onLoad="this.onload=null;this.rel='stylesheet'"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    media="print"
                    onLoad="this.media='all'"
                />

                {/* Favicon */}
                <link rel="icon" href={useBaseUrl("/img/favicon.ico")} />

                {/* SEO Meta Tags */}
                <meta name="theme-color" content="#0f172a" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={siteConfig.url} />
                <meta property="og:site_name" content={siteConfig.title} />
                <meta property="og:title" content={siteConfig.title} />
                <meta property="og:description" content={siteConfig.tagline} />
                <meta property="og:image" content={useBaseUrl("/img/og-image.jpg")} />
                <meta name="twitter:image:alt" content={siteConfig.title} />
            </Head>

            {children}
        </>
    );
}
