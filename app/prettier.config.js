/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
    plugins: ["prettier-plugin-tailwindcss", "@trivago/prettier-plugin-sort-imports"],
    tabWidth: 4,
    printWidth: 120,
    // Import ordering
    importOrder: ["^@ionic/(.*)$", "^@lib/(.*)$", "^@components/(.*)$", "^@pages/(.*)$", "^[./]"],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};

export default config;
