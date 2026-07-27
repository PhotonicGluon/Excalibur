import { gcm } from "@noble/ciphers/aes.js";
import { gcm as gcmWC } from "@noble/ciphers/webcrypto.js";
import React from "react";

import { IonButton, IonContent, IonPage } from "@ionic/react";

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
    { size: "4 MiB", data: buf(4 * 1024 * 1024) },
    { size: "16 MiB", data: buf(16 * 1024 * 1024) },
    { size: "64 MiB", data: buf(64 * 1024 * 1024) },
];

async function mark(name: string, fn: () => Promise<Uint8Array>) {
    const start = performance.now();
    const output = await fn();
    const end = performance.now();
    const tag = Buffer.from(output.subarray(output.length - 16, output.length)).toString("hex");
    console.log(`${name}: ${Math.round((end - start) * 1e5) / 1e5}ms`);
    console.debug(`  Tag: ${tag}`);
}

const CryptoBenchPage: React.FC = () => {
    async function runBenchmarks() {
        const key = buf(32);
        const nonce = buf(12);

        // Benchmark
        for (const { size, data: buf } of buffers) {
            console.log(size);
            await mark("@noble/ciphers/aes.js      ", async () => gcm(key, nonce).encrypt(buf));
            await mark("@noble/ciphers/webcrypto.js", async () => await gcmWC(key, nonce).encrypt(buf));
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
