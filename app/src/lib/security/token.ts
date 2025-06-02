import jwt from "jsonwebtoken";

/**
 * Decodes a JSON Web Token (JWT) and returns its payload.
 *
 * Does NOT verify the signature of the token.
 *
 * @param token The JWT to decode.
 * @returns The decoded payload of the token as the specified type.
 */
export function decodeJWT<T>(token: string): T {
    return jwt.decode(token) as T;
}
