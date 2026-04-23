import { createFile } from "../helpers";
import { LARGE_SIZE, SMALL_SIZE } from "./constants";

describe("Upload and Download Operations", () => {
    beforeEach(() => {
        cy.login("http://127.0.0.1:8989", "test-user", "Password");
        cy.visit("/files/");
        cy.url().should("include", "/files");
    });

    describe("Single-file Upload and Download", () => {
        it("should handle small file", () => {
            createFile(SMALL_SIZE);
        });

        it("should handle large file", () => {
            createFile(LARGE_SIZE);
        });
    });

    describe("Multi-file Upload and Download", () => {
        it("should handle small files", () => {
            createFile(Array.from({ length: 5 }, () => SMALL_SIZE));
        });

        it("should handle large files", () => {
            createFile(Array.from({ length: 3 }, () => LARGE_SIZE));
        });
    });
});
