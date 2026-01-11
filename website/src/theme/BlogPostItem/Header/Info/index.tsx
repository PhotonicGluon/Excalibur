import clsx from "clsx";
import { type ReactNode } from "react";

import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import { useDateTimeFormat } from "@docusaurus/theme-common/internal";

import type { Props } from "@theme/BlogPostItem/Header/Info";

import styles from "./styles.module.css";

function WordCount({ wordCount }: { wordCount: number }) {
    return <>{`${wordCount} words`}</>;
}

function DateTime({ date, formattedDate }: { date: string; formattedDate: string }) {
    return <time dateTime={date}>{formattedDate}</time>;
}

function Spacer() {
    return <>{" · "}</>;
}

export default function BlogPostItemHeaderInfo({ className }: Props): ReactNode {
    const { metadata } = useBlogPost();
    const { date, readingTime: wordCount } = metadata; // Since we specify WPM as 1, reading time = word count

    const dateTimeFormat = useDateTimeFormat({
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    });

    const formatDate = (blogDate: string) => dateTimeFormat.format(new Date(blogDate));

    return (
        <div className={clsx(styles.container, "margin-vert--md", className)}>
            <DateTime date={date} formattedDate={formatDate(date)} />
            {typeof wordCount !== "undefined" && (
                <>
                    <Spacer />
                    <WordCount wordCount={wordCount} />
                </>
            )}
        </div>
    );
}
