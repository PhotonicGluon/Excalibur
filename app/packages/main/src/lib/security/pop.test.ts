import { expect } from "vitest";

import { generatePoP, generatePoPHeader } from "./pop";

test("generatePoP", () => {
    const pop = generatePoP(
        Buffer.from("one demo 16B key", "utf-8"),
        "GET",
        "/some-path",
        1234,
        Buffer.from("some nonce value", "utf-8"),
    );
    expect(pop).toEqual(Buffer.from("4116ecf4f60c9af95fdfeaa53704eab6eb816aa526a3e0a93550f2adfc702deb", "hex"));
});

test("generatePoPHeader", () => {
    const popHeader = generatePoPHeader(
        Buffer.from("one demo 16B key", "utf-8"),
        "GET",
        "/some-path",
        1234,
        Buffer.from("some nonce value", "utf-8"),
    );
    expect(popHeader).toEqual("1234 c29tZSBub25jZSB2YWx1ZQ== QRbs9PYMmvlf3+qlNwTqtuuBaqUmo+CpNVDyrfxwLes=");
});
