import { expect } from "vitest";

import NoiseNK from "./noise-nk";
import Ristretto255 from "./ristretto255";

const PRIV_KEY = 112358n;
const PUB_KEY = Ristretto255.GENERATOR.mul(PRIV_KEY);

const CLIENT_KEYSHARE_PRIV = 1234n;
const CLIENT_KEYSHARE_PUB = Ristretto255.GENERATOR.mul(CLIENT_KEYSHARE_PRIV);
const TAG_1 = Buffer.from("c8c72eeba4867ede902f0f0b2d91cc41", "hex");

const SERVER_KEYSHARE_PRIV = 5678n;
const SERVER_KEYSHARE_PUB = Ristretto255.GENERATOR.mul(SERVER_KEYSHARE_PRIV);
const TAG_2 = Buffer.from("504931aae34a4baf1e6ad64fab726047", "hex");

const SESSION_KEY = Buffer.from("c8fe061c86f910a6b2689f336067a83f7551cc209e3fe05cdbcc6621741c3e67", "hex");

describe("NoiseNK", () => {
    it("should have correct client to server message", () => {
        const noise = new NoiseNK(PUB_KEY);
        const [clientKeysharePub, tag] = noise.messageCToS(CLIENT_KEYSHARE_PRIV);
        expect(clientKeysharePub).toEqual(CLIENT_KEYSHARE_PUB);
        expect(tag).toEqual(TAG_1);
    });

    it("should derive the correct session key", () => {
        const noise = new NoiseNK(PUB_KEY);
        noise.messageCToS(CLIENT_KEYSHARE_PRIV);
        const sessionKey = noise.deriveSessionKey(SERVER_KEYSHARE_PUB, TAG_2);
        expect(Buffer.from(sessionKey)).toEqual(SESSION_KEY);
    });

    it("should reject bad tag", () => {
        const noise = new NoiseNK(PUB_KEY);
        noise.messageCToS(CLIENT_KEYSHARE_PRIV);
        expect(() => noise.deriveSessionKey(SERVER_KEYSHARE_PUB, Buffer.alloc(16))).toThrow();
    });
});
