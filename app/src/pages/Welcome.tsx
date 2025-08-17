import { IonButton, IonContent, IonPage, useIonRouter } from "@ionic/react";

const Welcome: React.FC = () => {
    const router = useIonRouter();

    return (
        <IonPage>
            <IonContent fullscreen>
                <div className="flex h-full items-center justify-center">
                    <div className="mx-auto flex w-4/5 flex-col">
                        <div className="flex flex-col items-baseline">
                            <h1 className="m-0 pb-2 text-4xl leading-none font-bold">Welcome to Excalibur</h1>
                            <h2 className="m-0 pb-2 text-2xl leading-none font-normal text-wrap">
                                A trustless secure file management solution using military-grade encryption.
                            </h2>
                        </div>

                        <IonButton
                            className="w-min"
                            onClick={() => {
                                localStorage.setItem("hasSeenWelcome", "true");
                                router.push("/server-choice", "forward", "replace");
                            }}
                        >
                            Continue
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Welcome;
