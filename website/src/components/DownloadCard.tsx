import { Download } from "lucide-react";
import React from "react";

import Link from "@docusaurus/Link";

interface DownloadLink {
    label: string;
    assetID: string;
}

export interface DownloadInfo {
    platform: string;
    icon: React.ReactNode;
    links: DownloadLink[];
}

const DownloadCard: React.FC<{ item: DownloadInfo }> = ({ item }) => {
    return (
        <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-md transition-all hover:border-blue-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-700 dark:hover:border-blue-800">
            <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-slate-50 p-2 text-slate-600 transition-colors *:block dark:bg-slate-700 dark:text-slate-200">
                    {item.icon}
                </div>
            </div>

            <h3 className="mb-1 text-lg font-bold text-black dark:text-white">{item.platform}</h3>

            <div className="flex flex-col gap-1">
                {item.links.map((link) => (
                    <div className="flex">
                        <Link
                            to={"/download-asset?id=" + link.assetID}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-blue-600 dark:bg-slate-600"
                        >
                            <Download className="size-4" />
                            {link.label}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default DownloadCard;
