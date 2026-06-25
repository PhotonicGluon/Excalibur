import { expect } from "vitest";

import { Ristretto255 } from "@lib/crypto/ristretto255";
import { bytesToBigInt } from "@lib/util";

import { OPAQUEAuthError, OPAQUEClient } from "./client";

describe("OPAQUE Validation Tests", () => {
    it("should reject Diffie-Hellman point at infinity", () => {
        const client = new OPAQUEClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => (client as any)._diffieHellman(0n, Ristretto255.GENERATOR)).toThrow(OPAQUEAuthError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => (client as any)._diffieHellman(1337n, Ristretto255.IDENTITY)).toThrow(OPAQUEAuthError);
    });
});

// Test vectors from RFC9807, Appendix C.1.1 and C.1.2
const CONTEXTS_RAW = ["4f50415155452d504f43", "4f50415155452d504f43"];
const CLIENT_IDENTITIES_RAW = [
    "", // Blank, should use client's public key
    "616c696365",
];
const SERVER_IDENTITIES_RAW = [
    "", // Blank, should use server's public key
    "626f62",
];
const PASSWORDS_RAW = [
    "436f7272656374486f72736542617474657279537461706c65",
    "436f7272656374486f72736542617474657279537461706c65",
];
const ENVELOPE_NONCES_RAW = [
    "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec",
    "ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec",
];
const SERVER_PUBLIC_KEYS_RAW = [
    "b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
    "b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
];
const CLIENT_NONCES_RAW = [
    "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
    "da7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc",
];
const CLIENT_KEYSHARE_SEEDS_RAW = [
    "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
    "82850a697b42a505f5b68fcdafce8c31f0af2b581f063cf1091933541936304b",
];
const BLIND_REGISTRATIONS_RAW = [
    "76cfbfe758db884bebb33582331ba9f159720ca8784a2a070a265d9c2d6abe01",
    "76cfbfe758db884bebb33582331ba9f159720ca8784a2a070a265d9c2d6abe01",
];
const BLIND_LOGINS_RAW = [
    "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
    "6ecc102d2e7a7cf49617aad7bbe188556792d4acd60a1a8a8d2b65d4b0790308",
];

const CLIENT_PUBLIC_KEYS_RAW = [
    "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c3675",
    "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c3675",
];

const REGISTRATION_REQUESTS_RAW = [
    "5059ff249eb1551b7ce4991f3336205bde44a105a032e747d21bf382e75f7a71",
    "5059ff249eb1551b7ce4991f3336205bde44a105a032e747d21bf382e75f7a71",
];
const REGISTRATION_RESPONSES_RAW = [
    "7408a268083e03abc7097fc05b587834539065e86fb0c7b6342fcf5e01e5b019b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
    "7408a268083e03abc7097fc05b587834539065e86fb0c7b6342fcf5e01e5b019b2fe7af9f48cc502d016729d2fe25cdd433f2c4bc904660b2a382c9b79df1a78",
];
const REGISTRATION_UPLOADS_RAW = [
    "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c36751ac5844383c7708077dea41cbefe2fa15724f449e535dd7dd562e66f5ecfb95864eadddec9db5874959905117dad40a4524111849799281fefe3c51fa82785c5ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec634b0f5b96109c198a8027da51854c35bee90d1e1c781806d07d49b76de6a28b8d9e9b6c93b9f8b64d16dddd9c5bfb5fea48ee8fd2f75012a8b308605cdd8ba5",
    "76a845464c68a5d2f7e442436bb1424953b17d3e2e289ccbaccafb57ac5c36751ac5844383c7708077dea41cbefe2fa15724f449e535dd7dd562e66f5ecfb95864eadddec9db5874959905117dad40a4524111849799281fefe3c51fa82785c5ac13171b2f17bc2c74997f0fce1e1f35bec6b91fe2e12dbd323d23ba7a38dfec1ac902dc5589e9a5f0de56ad685ea8486210ef41449cd4d8712828913c5d2b680b2b3af4a26c765cff329bfb66d38ecf1d6cfa9e7a73c222c6efe0d9520f7d7c",
];
const KE1_RAW = [
    "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
    "c4dedb0ba6ed5d965d6f250fbe554cd45cba5dfcce3ce836e4aee778aa3cd44dda7e07376d6d6f034cfa9bb537d11b8c6b4238c334333d1f0aebb380cae6a6cc6e29bee50701498605b2c085d7b241ca15ba5c32027dd21ba420b94ce60da326",
];
const KE2_RAW = [
    "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fedc80188ca46743c52786e0382f95ad85c08f6afcd1ccfbff95e2bdeb015b166c6b20b92f832cc6df01e0b86a7efd92c1c804ff865781fa93f2f20b446c8371b671cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a660c48dae03e57aaa38f3d0cffcfc21852ebc8b405d15bd6744945ba1a93438a162b6111699d98a16bb55b7bdddfe0fc5608b23da246e7bd73b47369169c5c90",
    "7e308140890bcde30cbcea28b01ea1ecfbd077cff62c4def8efa075aabcbb47138fe59af0df2c79f57b8780278f5ae47355fe1f817119041951c80f612fdfc6dd6ec60bcdb26dc455ddf3e718f1020490c192d70dfc7e403981179d8073d1146a4f9aa1ced4e4cd984c657eb3b54ced3848326f70331953d91b02535af44d9fea502150b67fe36795dd8914f164e49f81c7688a38928372134b7dccd50e09f8fed9518b7b2f94835b3c4fe4c8475e7513f20eb97ff0568a39caee3fd6251876f71cd9960ecef2fe0d0f7494986fa3d8b2bb01963537e60efb13981e138e3d4a1c4f62198a9d6fa9170c42c3c71f1971b29eb1d5d0bd733e40816c91f7912cc4a292371e7809a9031743e943fb3b56f51de903552fc91fba4e7419029951c3970b2e2f0a9dea218d22e9e4e0000855bb6421aa3610d6fc0f4033a6517030d4341",
];
const KE3_RAW = [
    "4455df4f810ac31a6748835888564b536e6da5d9944dfea9e34defb9575fe5e2661ef61d2ae3929bcf57e53d464113d364365eb7d1a57b629707ca48da18e442",
    "7a026de1d6126905736c3f6d92463a08d209833eb793e46d0f7f15b3e0f62c7643763c02bbc6b8d3d15b63250cae98171e9260f1ffa789750f534ac11a0176d5",
];
const EXPORT_KEYS_RAW = [
    "1ef15b4fa99e8a852412450ab78713aad30d21fa6966c9b8c9fb3262a970dc62950d4dd4ed62598229b1b72794fc0335199d9f7fcc6eaedde92cc04870e63f16",
    "1ef15b4fa99e8a852412450ab78713aad30d21fa6966c9b8c9fb3262a970dc62950d4dd4ed62598229b1b72794fc0335199d9f7fcc6eaedde92cc04870e63f16",
];
const SESSION_KEYS_RAW = [
    "42afde6f5aca0cfa5c163763fbad55e73a41db6b41bc87b8e7b62214a8eedc6731fa3cb857d657ab9b3764b89a84e91ebcb4785166fbb02cedfcbdfda215b96f",
    "ae7951123ab5befc27e62e63f52cf472d6236cb386c968cc47b7e34f866aa4bc7638356a73cfce92becf39d6a7d32a1861f12130e824241fe6cab34fbd471a57",
];

const CONTEXTS = CONTEXTS_RAW.map((context) => Buffer.from(context, "hex"));
const CLIENT_IDENTITIES = CLIENT_IDENTITIES_RAW.map((identity) => Buffer.from(identity, "hex"));
const SERVER_IDENTITIES = SERVER_IDENTITIES_RAW.map((identity) => Buffer.from(identity, "hex"));
const PASSWORDS = PASSWORDS_RAW.map((password) => Buffer.from(password, "hex"));
const ENVELOPE_NONCES = ENVELOPE_NONCES_RAW.map((nonce) => Buffer.from(nonce, "hex"));
const SERVER_PUBLIC_KEYS = SERVER_PUBLIC_KEYS_RAW.map((key) => Ristretto255.fromBytes(Buffer.from(key, "hex")));
const CLIENT_NONCES = CLIENT_NONCES_RAW.map((nonce) => Buffer.from(nonce, "hex"));
const CLIENT_KEYSHARE_SEEDS = CLIENT_KEYSHARE_SEEDS_RAW.map((seed) => Buffer.from(seed, "hex"));
const BLIND_REGISTRATIONS = BLIND_REGISTRATIONS_RAW.map((blind) => bytesToBigInt(Buffer.from(blind, "hex"), "little"));
const BLIND_LOGINS = BLIND_LOGINS_RAW.map((blind) => bytesToBigInt(Buffer.from(blind, "hex"), "little"));

const CLIENT_PUBLIC_KEYS = CLIENT_PUBLIC_KEYS_RAW.map((key) => Ristretto255.fromBytes(Buffer.from(key, "hex")));

const REGISTRATION_REQUESTS = REGISTRATION_REQUESTS_RAW.map((request) => Buffer.from(request, "hex"));
const REGISTRATION_RESPONSES = REGISTRATION_RESPONSES_RAW.map((response) => Buffer.from(response, "hex"));
const REGISTRATION_UPLOADS = REGISTRATION_UPLOADS_RAW.map((upload) => Buffer.from(upload, "hex"));
const KE1 = KE1_RAW.map((ke1) => Buffer.from(ke1, "hex"));
const KE2 = KE2_RAW.map((ke2) => Buffer.from(ke2, "hex"));
const KE3 = KE3_RAW.map((ke3) => Buffer.from(ke3, "hex"));
const EXPORT_KEYS = EXPORT_KEYS_RAW.map((exportKey) => Buffer.from(exportKey, "hex"));
const SESSION_KEYS = SESSION_KEYS_RAW.map((sessionKey) => Buffer.from(sessionKey, "hex"));

describe("OPAQUEClient", () => {
    const opaqueClient = new OPAQUEClient("ristretto255-sha512");

    describe("Registration", () => {
        describe("Request", () => {
            for (let i = 0; i < REGISTRATION_REQUESTS.length; i++) {
                it(`test case ${i + 1}`, () => {
                    const [ourRegistrationRequest, ourBlind] = opaqueClient.createRegistrationRequest(
                        PASSWORDS[i],
                        // Parameters specified for tests
                        BLIND_REGISTRATIONS[i],
                    );

                    expect(ourBlind).toEqual(BLIND_REGISTRATIONS[i]);
                    expect(Buffer.from(ourRegistrationRequest.serialize())).toEqual(REGISTRATION_REQUESTS[i]);
                    expect(opaqueClient.deserializeRegistrationRequest(REGISTRATION_REQUESTS[i]).serialize()).toEqual(
                        ourRegistrationRequest.serialize(),
                    );
                });
            }
        });

        describe("Upload", () => {
            for (let i = 0; i < REGISTRATION_UPLOADS.length; i++) {
                it(`test case ${i + 1}`, () => {
                    const [ourRecord, ourExportKey] = opaqueClient.finalizeRegistrationRequest(
                        PASSWORDS[i],
                        BLIND_REGISTRATIONS[i],
                        opaqueClient.deserializeRegistrationResponse(REGISTRATION_RESPONSES[i]),
                        SERVER_IDENTITIES[i],
                        CLIENT_IDENTITIES[i],
                        // Parameters specified for tests
                        ENVELOPE_NONCES[i],
                    );

                    expect(ourExportKey).toEqual(EXPORT_KEYS[i]);
                    expect(Buffer.from(ourRecord.serialize())).toEqual(REGISTRATION_UPLOADS[i]);
                });
            }
        });
    });

    describe("Authenticated Key Exchange", () => {
        describe("KE1", () => {
            for (let i = 0; i < KE1.length; i++) {
                it(`test case ${i + 1}`, () => {
                    const ourKE1 = opaqueClient.generateKE1(
                        PASSWORDS[i],
                        BLIND_LOGINS[i],
                        // Parameters specified for tests
                        CLIENT_NONCES[i],
                        CLIENT_KEYSHARE_SEEDS[i],
                    );

                    expect(Buffer.from(ourKE1.serialize())).toEqual(KE1[i]);
                    expect(opaqueClient.deserializeKE1(KE1[i]).serialize()).toEqual(ourKE1.serialize());
                });
            }
        });

        describe("KE3", () => {
            for (let i = 0; i < KE3.length; i++) {
                it(`test case ${i + 1}`, () => {
                    opaqueClient.context = CONTEXTS[i];

                    const clientIdentity =
                        CLIENT_IDENTITIES[i].length === 0 ? CLIENT_PUBLIC_KEYS[i].toBytes() : CLIENT_IDENTITIES[i];
                    const serverIdentity =
                        SERVER_IDENTITIES[i].length === 0 ? SERVER_PUBLIC_KEYS[i].toBytes() : SERVER_IDENTITIES[i];

                    // Set up client state
                    opaqueClient.generateKE1(
                        PASSWORDS[i],
                        BLIND_LOGINS[i],
                        // Parameters specified for tests
                        CLIENT_NONCES[i],
                        CLIENT_KEYSHARE_SEEDS[i],
                    );

                    // Generate KE3
                    const [ourKE3, ourSessionKey, ourExportKey] = opaqueClient.generateKE3(
                        clientIdentity,
                        serverIdentity,
                        opaqueClient.deserializeKE2(KE2[i]),
                    );

                    expect(Buffer.from(ourKE3.serialize())).toEqual(KE3[i]);
                    expect(opaqueClient.deserializeKE3(KE3[i]).serialize()).toEqual(ourKE3.serialize());
                    expect(ourExportKey).toEqual(EXPORT_KEYS[i]);
                    expect(ourSessionKey).toEqual(SESSION_KEYS[i]);
                });
            }
        });

        describe("Invalid Credentials in KE3", () => {
            for (let i = 0; i < KE3.length; i++) {
                it(`test case ${i + 1}`, () => {
                    opaqueClient.context = CONTEXTS[i];

                    const clientIdentity =
                        CLIENT_IDENTITIES[i].length === 0 ? CLIENT_PUBLIC_KEYS[i].toBytes() : CLIENT_IDENTITIES[i];
                    const serverIdentity =
                        SERVER_IDENTITIES[i].length === 0 ? SERVER_PUBLIC_KEYS[i].toBytes() : SERVER_IDENTITIES[i];

                    // First test is to truncate the client identity by 1
                    expect(() => {
                        opaqueClient.generateKE1(
                            PASSWORDS[i],
                            BLIND_LOGINS[i],
                            // Parameters specified for tests
                            CLIENT_NONCES[i],
                            CLIENT_KEYSHARE_SEEDS[i],
                        );
                        opaqueClient.generateKE3(
                            clientIdentity.slice(0, -1),
                            serverIdentity,
                            opaqueClient.deserializeKE2(KE2[i]),
                        );
                    }).toThrow(OPAQUEAuthError);

                    // Next test is to truncate the password by 1
                    expect(() => {
                        opaqueClient.generateKE1(
                            PASSWORDS[i].subarray(0, -1),
                            BLIND_LOGINS[i],
                            // Parameters specified for tests
                            CLIENT_NONCES[i],
                            CLIENT_KEYSHARE_SEEDS[i],
                        );
                        opaqueClient.generateKE3(clientIdentity, serverIdentity, opaqueClient.deserializeKE2(KE2[i]));
                    }).toThrow(OPAQUEAuthError);
                });
            }
        });
    });
});
