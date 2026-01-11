import Header from "@theme-original/BlogPostItem/Header";
import { type ReactNode } from "react";

import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import type { WrapperProps } from "@docusaurus/types";

import type HeaderType from "@theme/BlogPostItem/Header";

type Props = WrapperProps<typeof HeaderType>;

export default function HeaderWrapper(props: Props): ReactNode {
    const { metadata, isBlogPostPage } = useBlogPost();
    const { frontMatter } = metadata;

    const version = frontMatter.slug.replace(/^v/, "");
    const showDownloadButton = isBlogPostPage && version >= "0.3.0";

    return (
        <>
            {/* Main header stuff; no need to modify */}
            <Header {...props} />

            {/* Show downloads button */}
            {showDownloadButton && (
                <a
                    href={`/downloads?version=${frontMatter.slug.replace(/^v/, "")}`}
                    className="mb-2 block w-fit rounded-lg bg-blue-600 px-4 py-2 text-center text-white no-underline hover:bg-blue-700"
                >
                    Downloads for {version}
                </a>
            )}
        </>
    );
}
