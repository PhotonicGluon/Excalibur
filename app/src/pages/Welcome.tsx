import { IonButton, IonContent, IonPage, useIonRouter } from "@ionic/react";

const Welcome: React.FC = () => {
    const router = useIonRouter();

    return (
        <IonPage>
            <IonContent fullscreen>
                {/* Main container */}
                <div className="flex h-full items-center justify-center">
                    <div className="mx-auto flex w-4/5 flex-col">
                        {/* Branding */}
                        <div className="flex flex-col items-baseline">
                            <h1 className="-mt-4 mb-2 text-2xl font-bold">Welcome</h1>
                        </div>

                        <IonButton onClick={() => router.push("/server-choice", "forward", "replace")}>
                            Continue
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Welcome;
