import { expect } from "vitest";

import { getURLEncodedPath, quote, quotePlus, validateURL } from "./url";

describe("validateURL", () => {
    it("valid URL", () => {
        expect(validateURL("http://example.com")).toBe(true);
    });

    it("invalid URL", () => {
        expect(validateURL("not a url")).toBe(false);
    });
});

describe("quote", () => {
    it("works with no spaces", () => {
        expect(quote("test")).toBe("test");
    });

    it("works with spaces", () => {
        expect(quote("John Doe")).toBe("John%20Doe");
    });

    it("works with mixed characters", () => {
        expect(quote("John Doe+the III (the best)")).toBe("John%20Doe%2Bthe%20III%20%28the%20best%29");
    });

    it("works with unicode", () => {
        expect(quote("漢字")).toBe("%E6%BC%A2%E5%AD%97");
        expect(quote("/El Niño/")).toBe("/El%20Ni%C3%B1o/");
    });
});

describe("quotePlus", () => {
    it("works with no spaces", () => {
        expect(quotePlus("test")).toBe("test");
    });

    it("works with spaces", () => {
        expect(quotePlus("John Doe")).toBe("John+Doe");
    });

    it("works with mixed characters", () => {
        expect(quotePlus("John Doe+the III (the best)")).toBe("John+Doe%2Bthe+III+%28the+best%29");
    });

    it("works with unicode", () => {
        expect(quotePlus("漢字")).toBe("%E6%BC%A2%E5%AD%97");
        expect(quotePlus("/El Niño/")).toBe("%2FEl+Ni%C3%B1o%2F");
    });
});

describe("getURLEncodedPath", () => {
    it("no path", () => {
        expect(getURLEncodedPath("http://example.com")).toBe("/");
    });

    it("with simple path", () => {
        expect(getURLEncodedPath("http://example.com/test")).toBe("/test");
    });

    it("path with spaces", () => {
        expect(getURLEncodedPath("http://example.com/John Doe")).toBe("/John%20Doe");
    });

    it("path with slashes", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe")).toBe("/John/Doe");
    });

    it("path with slashes and spaces", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe Jr")).toBe("/John/Doe%20Jr");
    });

    it("path with mixed characters", () => {
        expect(getURLEncodedPath("http://example.com/John/Doe+the III")).toBe("/John/Doe%2Bthe%20III");
    });

    it("path with unicode", () => {
        expect(getURLEncodedPath("http://example.com/測試/測")).toBe("/%E6%B8%AC%E8%A9%A6/%E6%B8%AC");
    });
});
