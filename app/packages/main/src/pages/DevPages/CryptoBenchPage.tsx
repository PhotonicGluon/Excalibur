import { IonButton, IonContent, IonPage } from "@ionic/react";
import { gcm } from "@noble/ciphers/aes.js";
import { createCipheriv } from "node:crypto";
import React from "react";

function buf(n: number) {
    return new Uint8Array(n).fill(n % 251);
}

const buffers = [
    { size: "16 B", data: buf(16) },
    { size: "32 B", data: buf(32) },
    { size: "64 B", data: buf(64) },
    { size: "1 KiB", data: buf(1024) },
    { size: "8 KiB", data: buf(1024 * 8) },
    { size: "16 KiB", data: buf(1024 * 16) },
    { size: "32 KiB", data: buf(1024 * 32) },
    { size: "128 KiB", data: buf(1024 * 128) },
    { size: "1 MiB", data: buf(1024 * 1024) },
];

async function mark(name: string, fn: () => void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
}

const CryptoBenchPage: React.FC = () => {
    async function runBenchmarks() {
        const key = buf(32);
        const nonce = buf(12);

        // Benchmark
        for (const { size, data: buf } of buffers) {
            console.log(size);
            await mark("crypto (polyfilled)", () => {
                const cipher = createCipheriv("aes-256-gcm", key, nonce);
                cipher.update(buf);
                cipher.final();
            });
            await mark("@noble/ciphers     ", () => gcm(key, nonce).encrypt(buf));
        }
    }

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Crypto Benchmarking Page</h1>
                <IonButton onClick={runBenchmarks}>Run Benchmarks</IonButton>
            </IonContent>
        </IonPage>
    );
};

export default CryptoBenchPage;
