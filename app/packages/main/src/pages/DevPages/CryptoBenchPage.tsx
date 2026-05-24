import { createCipheriv } from "node:crypto";
import React from "react";

import { IonButton, IonContent, IonPage } from "@ionic/react";

import { GCMCipher } from "@lib/crypto/cipher";

const NUM_TRIALS = 16;

function buf(n: number) {
    return new Uint8Array(n).fill(n % 251);
}

const buffers = [
    { size: "1 KiB", data: buf(1024) },
    { size: "64 KiB", data: buf(1024 * 64) },
    { size: "256 KiB", data: buf(1024 * 256) },
    { size: "1 MiB", data: buf(1024 * 1024) },
    { size: "4 MiB", data: buf(1024 * 1024 * 4) },
];

const CryptoBenchPage: React.FC = () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const states = buffers.map(() => React.useState<string>("Waiting for results..."));

    async function mark(name: string, fn: () => void, setResults: React.Dispatch<React.SetStateAction<string>>) {
        let sum = 0;
        for (let i = 0; i < NUM_TRIALS; i++) {
            console.debug(`${name}: trial ${i + 1}/${NUM_TRIALS}`);
            const start = performance.now();
            fn();
            const end = performance.now();
            sum += end - start;
        }
        setResults((prev) => prev + `${name}: ${Math.round((sum / NUM_TRIALS) * 1e6) / 1e6}ms\n`);
    }

    async function runBenchmarks() {
        const key = buf(32);
        const nonce = buf(12);
        const chunkSize = 1024;

        // Benchmark
        for (let i = 0; i < buffers.length; i++) {
            const { data: buf } = buffers[i];
            const [_result, setResult] = states[i];

            const chunks: Uint8Array[] = [];
            for (let i = 0; i < buf.length; i += chunkSize) {
                chunks.push(buf.slice(i, i + chunkSize));
            }

            setResult("");

            await mark(
                "polyfilled `crypto`",
                () => {
                    const cipher = createCipheriv("aes-256-gcm", key, nonce);
                    for (const chunk of chunks) {
                        cipher.update(chunk);
                    }
                    cipher.final();
                },
                setResult,
            );
            await mark(
                "@noble/ciphers     ",
                () => {
                    const cipher = new GCMCipher("aes-256-gcm", Buffer.from(key), Buffer.from(nonce));
                    for (const chunk of chunks) {
                        cipher.update(chunk);
                    }
                    cipher.final();
                },
                setResult,
            );
        }
    }

    // Render
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <h1>Crypto Benchmarking Page</h1>
                <IonButton
                    onClick={() => {
                        runBenchmarks();
                    }}
                >
                    Run Benchmarks
                </IonButton>

                {states.map(([result], index) => (
                    <div key={index}>
                        <h2>{buffers[index].size}</h2>
                        <pre className="rounded-xl bg-black p-4" id={`bench-results-${index}`}>
                            {result}
                        </pre>
                    </div>
                ))}
            </IonContent>
        </IonPage>
    );
};

export default CryptoBenchPage;
