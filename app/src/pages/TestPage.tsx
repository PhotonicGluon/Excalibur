import React, { useState } from "react";

import { IonContent, IonPage } from "@ionic/react";

import BIP39WordInput from "@components/inputs/BIP39WordInput";

const TestPage: React.FC = () => {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <BIP39WordInput maxSuggestions={5} onWordSelected={setSelectedWord} placeholder="Enter a word" />
                {selectedWord && <p>Selected Word: {selectedWord}</p>}
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
