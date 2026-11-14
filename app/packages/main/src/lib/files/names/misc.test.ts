import { expect } from "vitest";

import { validateName } from "./misc";

describe("validateName", () => {
    it("should accept ordinary names", () => {
        expect(validateName("file.txt")).toBeNull();
        expect(validateName("file.exef")).toBeNull();
        expect(validateName("...")).toBeNull();
    });

    for (const name of ["", ".", "..", "a/b", "/"]) {
        it(`should reject '${name}'`, () => {
            expect(validateName(name)).not.toBeNull();
        });
    }
});
