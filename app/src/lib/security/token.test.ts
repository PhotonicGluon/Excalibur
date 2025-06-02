import { decodeJWT } from "./token";

test("decodeJWT", () => {
    expect(
        decodeJWT<{ sub: string; name: string; admin: boolean; iat: number }>(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30",
        ),
    ).toEqual({ sub: "1234567890", name: "John Doe", admin: true, iat: 1516239022 });
});
