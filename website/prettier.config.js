/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
    plugins: ["@trivago/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
    tabWidth: 4,
    printWidth: 120,
    // Import ordering
    importOrder: ["^@docusaurus/(.*)$", "^@theme/(.*)$", "^[./]"],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};

module.exports = config;
