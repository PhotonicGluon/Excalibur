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

const Credits: React.FC = () => {
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar className="ion-padding-top flex">
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
                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://ionicframework.com/"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">
                                    Ionic Framework
                                </h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    MIT License - Cross-platform mobile and desktop UI toolkit
                                </IonText>
                                <IonText color="primary" className="text-xs break-all">
                                    ionicframework.com
                                </IonText>
                            </IonLabel>
                        </IonItem>

                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://capacitorjs.com/"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">Capacitor</h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    MIT License - Cross-platform mobile and desktop UI toolkit
                                </IonText>
                                <IonText color="primary" className="text-xs break-all">
                                    capacitorjs.com
                                </IonText>
                            </IonLabel>
                        </IonItem>

                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://reactjs.org/"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">React</h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    MIT License - JavaScript UI library
                                </IonText>
                                <IonText color="primary" className="text-xs break-all">
                                    reactjs.org
                                </IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>

                    <IonText className="text-primary-600 dark:text-primary-400 block text-lg font-semibold">
                        Fonts
                    </IonText>
                    <IonList lines="none" className="!mb-4 space-y-3 [background:var(--item-bg)!important]">
                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://fonts.google.com/specimen/Inter"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">Inter</h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    SIL Open Font License, Version 1.1
                                </IonText>
                                <IonText color="primary" className="text-xs">
                                    View on Google Fonts
                                </IonText>
                            </IonLabel>
                        </IonItem>
                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://fonts.google.com/specimen/Fira+Code"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">Fira Code</h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    SIL Open Font License, Version 1.1
                                </IonText>
                                <IonText color="primary" className="text-xs">
                                    View on Google Fonts
                                </IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>

                    <IonText className="text-primary-600 dark:text-primary-400 block text-lg font-semibold">
                        Icons
                    </IonText>
                    <IonList lines="none" className="!mb-4 space-y-3 [background:var(--item-bg)!important]">
                        <IonItem
                            className="[--background:var(--item-bg)]"
                            button
                            detail={false}
                            href="https://ionicons.com/"
                            target="_blank"
                        >
                            <IonLabel className="ion-text-wrap">
                                <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">Ionicons</h3>
                                <IonText color="medium" className="mb-2 block text-xs">
                                    MIT License - Open source icons
                                </IonText>
                                <IonText color="primary" className="text-xs break-all">
                                    ionicons.com
                                </IonText>
                            </IonLabel>
                        </IonItem>
                    </IonList>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Credits;
