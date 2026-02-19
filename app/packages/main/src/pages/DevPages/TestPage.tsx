import React from "react";

import { IonContent, IonPage } from "@ionic/react";

import DirectoryItem from "@components/explorer/DirectoryItem";

const TestPage: React.FC = () => {
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Test Page</h1>
                <DirectoryItem
                    oddRow={true}
                    disabled={false}
                    name="Sample File.txt.exef"
                    fullpath="/some/path"
                    size={123456}
                    type="file"
                ></DirectoryItem>
                <DirectoryItem
                    oddRow={true}
                    disabled={true}
                    name="Disabled.txt.exef"
                    fullpath="/some/path"
                    size={123456}
                    type="file"
                ></DirectoryItem>
                <DirectoryItem
                    oddRow={true}
                    disabled={false}
                    name="Sample File.txt.exef"
                    fullpath="/some/path"
                    size={123456}
                    type="file"
                    onClickItemOverride={() => {
                        console.log("TEST!!!");
                    }}
                ></DirectoryItem>
            </IonContent>
        </IonPage>
    );
};

export default TestPage;
