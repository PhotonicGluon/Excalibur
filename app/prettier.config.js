/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
    plugins: ["@trivago/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
    tabWidth: 4,
    printWidth: 120,
    // Import ordering
    importOrder: [
        "^(?:@root|@ionic|ionicons)/(.*)$",
        "^@lib/(.*)$",
        "^@components/(.*)$",
        "^@pages/(.*)$",
        "^@theme/(.*)$",
        "^@assets/(.*)$",
        "^[./]",
    ],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};

export default config;
