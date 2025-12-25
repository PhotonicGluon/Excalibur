import React from "react";

export interface CreditsItem {
    name: string;
    desc: string;
    cta: string;
    href: string;
}

const CreditsCard: React.FC<{ item: CreditsItem }> = ({ item }) => {
    return (
        <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all dark:border-slate-700 dark:bg-gray-800">
            <h3 className="mb-1 text-lg font-bold text-black dark:text-white">{item.name}</h3>
            <span className="text-sm text-slate-600 dark:text-slate-300">{item.desc}</span>
            <a className="mt-1" href={item.href} target="_blank">
                {item.cta}
            </a>
        </div>
    );
};
export default CreditsCard;
