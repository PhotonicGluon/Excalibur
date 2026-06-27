import Ristretto255 from "./ristretto255";

export default class ElGamal {
    static encrypt(publicKey: Ristretto255, m: Ristretto255, blindScalar?: bigint): Buffer {
        const y = blindScalar ?? Ristretto255.randomScalar();

        const s = publicKey.mul(y);
        const c1 = Ristretto255.GENERATOR.mul(y);
        const c2 = m.add(s);

        return Buffer.concat([c1.toBytes(), c2.toBytes()]);
    }

    static decrypt(privateKey: bigint, ciphertext: Buffer): Ristretto255 {
        const c1 = Ristretto255.fromBytes(ciphertext.subarray(0, Ristretto255.KEY_LENGTH));
        const c2 = Ristretto255.fromBytes(ciphertext.subarray(Ristretto255.KEY_LENGTH));

        const s = c1.mul(privateKey);
        const m = c2.sub(s);

        return m;
    }
}
