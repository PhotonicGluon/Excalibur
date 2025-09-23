import {
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonText,
    IonTitle,
    IonToolbar,
} from "@ionic/react";

// Credits lists
interface CreditsItem {
    name: string;
    desc: string;
    cta: string;
    href: string;
}

const FRAMEWORKS_AND_LIBRARIES: CreditsItem[] = [
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
        href: "https://www.typescriptlang.org/",
    },
    {
        name: "Comlink",
        desc: "Apache-2.0 License - Web Workers made easy",
        cta: "Comlink GitHub",
        href: "https://github.com/GoogleChromeLabs/comlink",
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
];
const FONTS: CreditsItem[] = [
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
];
const OTHERS: CreditsItem[] = [
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
];

// Components
const Credits: React.FC = () => {
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="[&::part(container)]:min-h-16">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/"></IonBackButton>
                    </IonButtons>
                    <IonTitle>Credits</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding-horizontal [--item-bg:theme(colors.neutral.100)] dark:[--item-bg:theme(colors.neutral.900)]">
                <div className="mx-auto max-w-full py-4">
                    <IonText color="medium" className="mb-6 block text-sm">
                        Excalibur was made possible by these open-source frameworks and libraries.
                    </IonText>

                    <IonText className="text-primary-600 dark:text-primary-400 block text-lg font-semibold">
                        Frameworks & Libraries
                    </IonText>
                    <IonList lines="none" className="!mb-4 space-y-3 [background:var(--item-bg)!important]">
                        {FRAMEWORKS_AND_LIBRARIES.map((item) => (
                            <IonItem
                                className="[--background:var(--item-bg)]"
                                button
                                detail={false}
                                href={item.href}
                                target="_blank"
                            >
                                <IonLabel className="ion-text-wrap">
                                    <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>
                                    <IonText color="medium" className="mb-2 block text-xs">
                                        {item.desc}
                                    </IonText>
                                    <IonText color="primary" className="text-xs break-all">
                                        {item.cta}
                                    </IonText>
                                </IonLabel>
                            </IonItem>
                        ))}
                    </IonList>

                    <IonText className="text-primary-600 dark:text-primary-400 block text-lg font-semibold">
                        Fonts
                    </IonText>
                    <IonList lines="none" className="!mb-4 space-y-3 [background:var(--item-bg)!important]">
                        {FONTS.map((item) => (
                            <IonItem
                                className="[--background:var(--item-bg)]"
                                button
                                detail={false}
                                href={item.href}
                                target="_blank"
                            >
                                <IonLabel className="ion-text-wrap">
                                    <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>
                                    <IonText color="medium" className="mb-2 block text-xs">
                                        {item.desc}
                                    </IonText>
                                    <IonText color="primary" className="text-xs">
                                        {item.cta}
                                    </IonText>
                                </IonLabel>
                            </IonItem>
                        ))}
                    </IonList>

                    <IonText className="text-primary-600 dark:text-primary-400 block text-lg font-semibold">
                        Others
                    </IonText>
                    <IonList lines="none" className="!mb-4 space-y-3 [background:var(--item-bg)!important]">
                        {OTHERS.map((item) => (
                            <IonItem
                                className="[--background:var(--item-bg)]"
                                button
                                detail={false}
                                href={item.href}
                                target="_blank"
                            >
                                <IonLabel className="ion-text-wrap">
                                    <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>
                                    <IonText color="medium" className="mb-2 block text-xs">
                                        {item.desc}
                                    </IonText>
                                    <IonText color="primary" className="text-xs">
                                        {item.cta}
                                    </IonText>
                                </IonLabel>
                            </IonItem>
                        ))}
                    </IonList>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Credits;
