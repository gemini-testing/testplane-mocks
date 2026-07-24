import { attachErrorAsDeepestCause } from "./utils";

type WithCause = Error & { cause?: unknown };

describe("attachErrorAsDeepestCause", () => {
    it("should attach cause to an error without an existing cause", () => {
        const root = new Error("root");
        const cause = new Error("cause");

        attachErrorAsDeepestCause(root, cause);

        expect((root as WithCause).cause).toBe(cause);
    });

    it("should attach cause to the deepest error in the chain", () => {
        const leaf = new Error("leaf");
        const mid = new Error("mid") as WithCause;
        mid.cause = leaf;
        const root = new Error("root") as WithCause;
        root.cause = mid;
        const cause = new Error("mocks");

        attachErrorAsDeepestCause(root, cause);

        expect((leaf as WithCause).cause).toBe(cause);
        expect(root.cause).toBe(mid);
    });

    it("should not attach cause if it is already present in the chain", () => {
        const cause = new Error("mocks");
        const root = new Error("root") as WithCause;
        root.cause = cause;

        attachErrorAsDeepestCause(root, cause);

        expect(root.cause).toBe(cause);
        expect((cause as WithCause).cause).toBeUndefined();
    });

    it("should not attach cause deeper than the max depth", () => {
        const root = new Error("root") as WithCause;
        let deepest: WithCause = root;

        for (let i = 0; i < 25; i++) {
            const next = new Error(`level-${i}`) as WithCause;
            deepest.cause = next;
            deepest = next;
        }

        const cause = new Error("mocks");

        attachErrorAsDeepestCause(root, cause);

        expect((deepest as WithCause).cause).toBeUndefined();
    });
});
