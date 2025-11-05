import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import BIP39MnemonicInput from "@components/inputs/BIP39MnemonicInput";

const TestPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <BIP39MnemonicInput
                    // initialWords={"vessel ladder alter error federal sibling chat ability sun glass valve picture".split(
                    //     " ",
                    // )}
                    initialWords={"vessel ladder alter error federal".split(" ")}
                    maxSuggestions={5}
                    numWords={12}
                    onEntropy={(entropy) => console.log("Entropy: ", entropy)}
                    onError={(error) => console.error("Error: ", error)}
                />
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
