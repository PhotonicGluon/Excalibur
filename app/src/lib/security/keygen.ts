import { createHash } from "crypto";

function generateKey(password: string): Buffer {
    // TODO: Actually use the actual keygen algorithm, rather than SHA256
    const hash = createHash("sha256");
    hash.update(password);
    return hash.digest();
}
