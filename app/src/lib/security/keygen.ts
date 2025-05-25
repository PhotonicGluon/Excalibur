import { createHash } from "crypto";

export function generateKey(password: string, salt: Buffer): Buffer {
    // TODO: Actually use the actual keygen algorithm, rather than SHA256
    // TODO: Also add test
    const hash = createHash("sha256");
    hash.update(salt);
    hash.update(password);
    return hash.digest();
}
