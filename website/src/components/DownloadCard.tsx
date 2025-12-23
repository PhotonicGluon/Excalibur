import { Download } from "lucide-react";
import React from "react";

export interface DownloadLink {
    platform: string;
    label: string;
    href: string;
    icon: React.ReactNode;
}

const DownloadCard: React.FC<{ item: DownloadLink }> = ({ item }) => {
    return (
        <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-slate-50 p-2 text-slate-600 transition-colors *:block dark:bg-slate-700 dark:text-slate-200">
                    {item.icon}
                </div>
            </div>

            <h3 className="mb-1 text-lg font-bold text-black dark:text-white">{item.platform}</h3>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-300">{item.label}</p>

            <div className="mt-auto flex">
                <a
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-blue-600 dark:hover:bg-blue-700"
                >
                    <Download className="size-4" />
                    Download
                </a>
            </div>
        </div>
    );
};
export default DownloadCard;
