import js from "@eslint/js";
import chaiFriendly from "eslint-plugin-chai-friendly";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    { ignores: ["**/dist", "**/out", "packages/main/cypress.config.ts", "packages/android"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            "chai-friendly": chaiFriendly,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "@typescript-eslint/no-namespace": "off",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            "@typescript-eslint/no-unused-expressions": "off",
            "chai-friendly/no-unused-expressions": "error",
        },
    },
);
