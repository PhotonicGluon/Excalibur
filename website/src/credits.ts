import { CreditsItem } from "@site/src/components/CreditsCard";

const CREDITS: Record<string, Record<string, CreditsItem[]>> = {
    app: {
        libraries: [
            {
                name: "Ionic Framework",
                desc: "MIT License - Cross-platform mobile and desktop UI toolkit",
                cta: "ionicframework.com",
                href: "https://ionicframework.com/",
            },
            {
                name: "Capacitor",
                desc: "MIT License - Cross-platform native runtime",
                cta: "capacitorjs.com",
                href: "https://capacitorjs.com/",
            },
            {
                name: "React",
                desc: "MIT License - JavaScript UI library",
                cta: "reactjs.org",
                href: "https://reactjs.org/",
            },
            {
                name: "React Router",
                desc: "MIT License - Declarative routing for React",
                cta: "reactrouter.com",
                href: "https://reactrouter.com/",
            },
            {
                name: "TailwindCSS",
                desc: "MIT License - CSS framework",
                cta: "tailwindcss.com",
                href: "https://tailwindcss.com/",
            },
            {
                name: "Vite",
                desc: "MIT License - Frontend build tool",
                cta: "vite.dev",
                href: "https://vite.dev/",
            },
            {
                name: "TypeScript",
                desc: "Apache-2.0 License - Typed JavaScript",
                cta: "typescriptlang.org",
                href: "https://typescriptlang.org/",
            },
            {
                name: "Comlink",
                desc: "Apache-2.0 License - Web Workers made easy",
                cta: "Comlink GitHub",
                href: "https://github.com/GoogleChromeLabs/comlink",
            },
            {
                name: "immer",
                desc: "MIT License - Immer library for immutable updates",
                cta: "immer GitHub",
                href: "https://github.com/immerjs/immer",
            },
            {
                name: "js-sha3",
                desc: "MIT License - SHA-3 (Keccak) hash function",
                cta: "js-sha3 GitHub",
                href: "https://github.com/emn178/js-sha3",
            },
            {
                name: "jsonwebtoken",
                desc: "MIT License - JSON Web Token implementation",
                cta: "jsonwebtoken GitHub",
                href: "https://github.com/auth0/node-jsonwebtoken",
            },
        ],
        electron: [
            {
                name: "Electron",
                desc: "MIT License - Cross-platform desktop app framework",
                cta: "electronjs.org",
                href: "https://electronjs.org/",
            },
            {
                name: "Electron-Vite",
                desc: "MIT License - Next generation Electron build tooling based on Vite",
                cta: "electron-vite.org",
                href: "https://electron-vite.org/",
            },
            {
                name: "Electron-Builder",
                desc: "MIT License - Electron application builder",
                cta: "electron.build",
                href: "https://electron.build/",
            },
        ],
        fonts: [
            {
                name: "Inter",
                desc: "SIL Open Font License, Version 1.1",
                cta: "View on Google Fonts",
                href: "https://fonts.google.com/specimen/Inter",
            },
            {
                name: "Fira Code",
                desc: "SIL Open Font License, Version 1.1",
                cta: "View on Google Fonts",
                href: "https://fonts.google.com/specimen/Fira+Code",
            },
        ],
        others: [
            {
                name: "Ionicons",
                desc: "MIT License - Open source icons",
                cta: "ionicons.com",
                href: "https://ionicons.com/",
            },
            {
                name: "Capacitor File Picker",
                desc: "MIT License - File picker plugin for Capacitor",
                cta: "Capacitor File Picker GitHub",
                href: "https://github.com/capawesome-team/capacitor-plugins/tree/main/packages/file-picker",
            },
            {
                name: "Capacitor Blob Writer",
                desc: "MIT License - Efficient file writing for Capacitor",
                cta: "Capacitor Blob Writer GitHub",
                href: "https://github.com/diachedelic/capacitor-blob-writer",
            },
            {
                name: "Vitest",
                desc: "MIT License - Fast unit test framework",
                cta: "vitest.dev",
                href: "https://vitest.dev/",
            },
            {
                name: "Cypress",
                desc: "MIT License - End-to-end testing framework",
                cta: "cypress.io",
                href: "https://www.cypress.io/",
            },
            {
                name: "Prettier",
                desc: "MIT License - Code formatter",
                cta: "prettier.io",
                href: "https://prettier.io/",
            },
            {
                name: "ESLint",
                desc: "MIT License - Pluggable JavaScript linter",
                cta: "eslint.org",
                href: "https://eslint.org/",
            },
        ],
    },
    server: {
        libraries: [
            {
                name: "FastAPI",
                desc: "MIT License - A modern fast web framework for building APIs in Python",
                cta: "fastapi.tiangolo.com",
                href: "https://fastapi.tiangolo.com/",
            },
            {
                name: "Uvicorn",
                desc: "BSD 3-Clause License - ASGI web server for Python",
                cta: "uvicorn.org",
                href: "https://uvicorn.org/",
            },
            {
                name: "PyCryptodome",
                desc: "Public Domain & BSD 2-Clause License - A self-contained Python package of low-level cryptographic primitives.",
                cta: "pycryptodome.org",
                href: "https://pycryptodome.org/",
            },
            {
                name: "Pydantic",
                desc: "MIT License - Data validation library for Python",
                cta: "docs.pydantic.dev",
                href: "https://docs.pydantic.dev/",
            },
        ],
        database: [
            {
                name: "DuckDB",
                desc: "MIT License - Fast, open-source, analytical database system",
                cta: "duckdb.org",
                href: "https://duckdb.org/",
            },
            {
                name: "SQLAlchemy",
                desc: "MIT License - Database ORM for Python",
                cta: "sqlalchemy.org",
                href: "https://www.sqlalchemy.org/",
            },
            {
                name: "SQLModel",
                desc: "MIT License - Library for interacting with SQL databases from Python code, with Python objects",
                cta: "sqlmodel.tiangolo.com",
                href: "https://sqlmodel.tiangolo.com/",
            },
            {
                name: "Alembic",
                desc: "MIT License - Database migration tool for SQLAlchemy",
                cta: "alembic.sqlalchemy.org",
                href: "https://alembic.sqlalchemy.org/",
            },
        ],
        others: [
            {
                name: "GitPython",
                desc: "MIT License - Python library used to interact with Git repositories",
                cta: "gitpython.readthedocs.io",
                href: "https://gitpython.readthedocs.io/en/stable/",
            },
            {
                name: "PyJWT",
                desc: "MIT License - JSON Web Token implementation for Python",
                cta: "pyjwt.readthedocs.io",
                href: "https://pyjwt.readthedocs.io/",
            },
            {
                name: "Python SemVer",
                desc: "BSD 3-Clause License - Python module to simplify semantic versioning",
                cta: "python-semver.readthedocs.io",
                href: "https://python-semver.readthedocs.io/en/stable/",
            },
            {
                name: "Python TOML",
                desc: "MIT License - Python library for parsing and creating TOML",
                cta: "Python TOML GitHub",
                href: "https://github.com/uiri/toml",
            },
            {
                name: "TOML Kit",
                desc: "MIT License - Style-preserving TOML library for Python",
                cta: "TOML Kit GitHub",
                href: "https://github.com/python-poetry/tomlkit",
            },
            {
                name: "PyTest",
                desc: "MIT License - Testing framework for Python",
                cta: "docs.pytest.org",
                href: "https://docs.pytest.org/",
            },
            {
                name: "Ruff",
                desc: "MIT License - An extremely fast Python linter and code formatter",
                cta: "docs.astral.sh/ruff",
                href: "https://docs.astral.sh/ruff/",
            },
        ],
    },
};

export default CREDITS;
